import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/search?q=ค่าจ้าง&type=all&limit=20
// type: 'all' | 'sections' | 'judgments' | 'laws' | 'regulations' | 'templates'
// Uses FTS5 + LIKE fallback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const type = searchParams.get('type') || 'all';
  const limit = Math.min(Number.parseInt(searchParams.get('limit') || '20', 10), 100);

  if (!q) {
    return NextResponse.json({ sections: [], judgments: [], laws: [], regulations: [], templates: [], total: 0 });
  }

  const safeQ = q.replace(/["']/g, ' ').trim();
  const tokens = safeQ.split(/\s+/).filter(Boolean);
  const ftsQuery = tokens.length === 1
    ? `"${tokens[0]}"`
    : tokens.map(t => `"${t}"`).join(' OR ');

  let sections: any[] = [];
  let judgments: any[] = [];
  let regulations: any[] = [];
  let templates: any[] = [];
  let laws: any[] = [];
  let lawsMap: Map<number, { law: any; hitCount: number }> = new Map();

  // ============ SECTIONS (FTS5) ============
  if (type === 'all' || type === 'sections') {
    try {
      const rows = await db.$queryRaw<any[]>(Prisma.sql`
        SELECT s.section_id, s.law_id, s.section_number, s.section_number_thai,
               s.section_text, s.is_labor_related,
               l.title as law_title, l.law_code, l.category
        FROM law_sections_fts
        JOIN law_sections s ON s.section_id = law_sections_fts.rowid
        JOIN laws l ON l.law_id = s.law_id
        WHERE law_sections_fts MATCH ${ftsQuery}
        ORDER BY rank
        LIMIT ${limit}
      `);
      sections = rows.map(r => ({
        type: 'section' as const,
        id: r.section_id,
        lawId: r.law_id,
        lawNameTh: r.law_title,  // legacy alias
        lawTitle: r.law_title,
        lawCode: r.law_code,
        category: r.category,
        isLaborLaw: r.category === 'labor',
        articleKey: r.section_number_thai || `มาตรา ${r.section_number}`,  // legacy alias
        sectionNumber: r.section_number,
        sectionNumberThai: r.section_number_thai,
        snippet: r.section_text?.slice(0, 200) || '',
        isLaborRelated: r.is_labor_related === 1,
      }));

      // Aggregate section hits by law
      for (const s of sections) {
        if (!lawsMap.has(s.lawId)) {
          lawsMap.set(s.lawId, { law: { lawId: s.lawId, lawNameTh: s.lawNameTh, lawTitle: s.lawTitle, category: s.category, isLaborLaw: s.isLaborLaw }, hitCount: 0 });
        }
        lawsMap.get(s.lawId)!.hitCount += 1;
      }
    } catch (e) {
      console.error('Search section FTS failed:', e);
    }

    // ALWAYS do LIKE fallback if FTS returned 0 results (Thai text issue)
    if (sections.length === 0) {
      const likeRows = await db.lawSection.findMany({
        where: { sectionText: { contains: q } },
        take: limit,
        include: { law: true },
      });
      sections = likeRows.map(r => ({
        type: 'section' as const,
        id: r.sectionId,
        lawId: r.lawId,
        lawNameTh: r.law.title,
        lawTitle: r.law.title,
        lawCode: r.law.lawCode,
        category: r.law.category,
        isLaborLaw: r.law.category === 'labor',
        articleKey: r.sectionNumberThai || `มาตรา ${r.sectionNumber}`,
        sectionNumber: r.sectionNumber,
        sectionNumberThai: r.sectionNumberThai,
        snippet: r.sectionText.slice(0, 200),
        isLaborRelated: r.isLaborRelated === 1,
      }));
      for (const s of sections) {
        if (!lawsMap.has(s.lawId)) {
          lawsMap.set(s.lawId, { law: { lawId: s.lawId, lawNameTh: s.lawNameTh, lawTitle: s.lawTitle, category: s.category, isLaborLaw: s.isLaborLaw }, hitCount: 0 });
        }
        lawsMap.get(s.lawId)!.hitCount += 1;
      }
    }
  }

  // ============ JUDGMENTS (FTS5) ============
  if (type === 'all' || type === 'judgments') {
    try {
      const rows = await db.$queryRaw<any[]>(Prisma.sql`
        SELECT j.judgment_id, j.deka_no, j.year, j.case_type,
               j.topic, j.fact, j.ruling, j.source_url, j.note,
               s.source_name
        FROM judgments_fts
        JOIN judgments j ON j.judgment_id = judgments_fts.rowid
        LEFT JOIN sources s ON s.source_id = j.source_id
        WHERE judgments_fts MATCH ${ftsQuery}
        ORDER BY rank
        LIMIT ${limit}
      `);
      judgments = rows.map(r => ({
        type: 'judgment' as const,
        id: r.judgment_id,
        caseNumber: r.deka_no,  // legacy alias
        dekaNo: r.deka_no,
        caseYear: r.year,  // legacy alias
        year: r.year,
        category: r.case_type,
        caseType: r.case_type,
        title: r.topic,
        topic: r.topic,
        snippet: (r.fact || r.ruling || '').slice(0, 200),
        sourceUrl: r.source_url,
        sourceName: r.source_name,
        licenseNote: r.note,
        note: r.note,
      }));
    } catch (e) {
      console.error('Search judgment FTS failed:', e);
    }

    // ALWAYS do LIKE fallback if FTS returned 0 results
    if (judgments.length === 0) {
      const likeRows = await db.judgment.findMany({
        where: {
          OR: [
            { fact: { contains: q } },
            { ruling: { contains: q } },
            { topic: { contains: q } },
          ],
        },
        take: limit,
        include: { source: true },
      });
      judgments = likeRows.map(r => ({
        type: 'judgment' as const,
        id: r.judgmentId,
        caseNumber: r.dekaNo,
        dekaNo: r.dekaNo,
        caseYear: r.year,
        year: r.year,
        category: r.caseType,
        caseType: r.caseType,
        title: r.topic,
        topic: r.topic,
        snippet: (r.fact || r.ruling || '').slice(0, 200),
        sourceUrl: r.sourceUrl,
        sourceName: r.source?.sourceName ?? null,
        licenseNote: r.note,
        note: r.note,
      }));
    }
  }

  // ============ REGULATIONS (FTS5) ============
  if (type === 'all' || type === 'regulations') {
    try {
      const rows = await db.$queryRaw<any[]>(Prisma.sql`
        SELECT r.regulation_id, r.regulation_code, r.title, r.category,
               r.full_text, r.is_repealed, r.repeal_status
        FROM regulations_fts
        JOIN regulations r ON r.regulation_id = regulations_fts.rowid
        WHERE regulations_fts MATCH ${ftsQuery}
          AND r.repeal_status = 'active'
        ORDER BY rank
        LIMIT ${Math.max(3, Math.floor(limit / 3))}
      `);
      regulations = rows.map(r => ({
        type: 'regulation' as const,
        id: r.regulation_id,
        regulationCode: r.regulation_code,
        title: r.title,
        category: r.category,
        snippet: r.full_text?.slice(0, 200) || '',
        isRepealed: r.is_repealed === 1,
        repealStatus: r.repeal_status,
      }));
    } catch (e) {
      console.error('Search regulation FTS failed:', e);
    }
  }

  // ============ CONTRACT TEMPLATES (FTS5) ============
  if (type === 'all' || type === 'templates') {
    try {
      const rows = await db.$queryRaw<any[]>(Prisma.sql`
        SELECT t.template_id, t.template_code, t.title, t.category,
               t.full_text
        FROM contract_templates_fts
        JOIN contract_templates t ON t.template_id = contract_templates_fts.rowid
        WHERE contract_templates_fts MATCH ${ftsQuery}
        ORDER BY rank
        LIMIT ${Math.max(3, Math.floor(limit / 3))}
      `);
      templates = rows.map(r => ({
        type: 'template' as const,
        id: r.template_id,
        templateCode: r.template_code,
        title: r.title,
        category: r.category,
        snippet: r.full_text?.slice(0, 200) || '',
      }));
    } catch (e) {
      console.error('Search template FTS failed:', e);
    }
  }

  // ============ LAWS (by name) ============
  if (type === 'all' || type === 'laws') {
    const lawRows = await db.law.findMany({
      where: { title: { contains: q } },
      take: limit,
      include: { _count: { select: { sections: true } } },
    });
    laws = lawRows.map(l => ({
      type: 'law' as const,
      id: l.lawId,
      lawNameTh: l.title,  // legacy alias
      title: l.title,
      lawCode: l.lawCode,
      lawNameEn: null,
      year: l.year,
      category: l.category,
      isLaborLaw: l.category === 'labor',
      sectionCount: l._count.sections,
    }));
    // Include laws that had section hits but weren't in the name match
    for (const [lawId, info] of lawsMap) {
      if (!laws.find(l => l.id === lawId)) {
        laws.push({
          type: 'law' as const,
          id: lawId,
          lawNameTh: info.law.lawNameTh || info.law.lawTitle,
          title: info.law.lawTitle || info.law.lawNameTh,
          lawCode: null,
          lawNameEn: null,
          year: null,
          category: info.law.category,
          isLaborLaw: info.law.isLaborLaw,
          sectionCount: 0,
          hitCount: info.hitCount,
        });
      }
    }
  }

  const total = sections.length + judgments.length + laws.length + regulations.length + templates.length;

  return NextResponse.json({
    sections,
    judgments,
    laws,
    regulations,
    templates,
    total,
    q,
    type,
  });
}
