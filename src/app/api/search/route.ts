import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/search?q=ค่าจ้าง&type=all&limit=20
// type: 'all' | 'sections' | 'judgments' | 'laws'
// Uses FTS5 virtual tables: law_sections_fts, case_judgments_fts
// Falls back to LIKE search if FTS5 unavailable
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const type = searchParams.get('type') || 'all';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  if (!q) {
    return NextResponse.json({ sections: [], judgments: [], laws: [], total: 0 });
  }

  // Build FTS5 query — wrap whole phrase in quotes for Thai text (no word boundaries)
  // For multi-token queries, use OR between quoted tokens
  const safeQ = q.replace(/["']/g, ' ').trim();
  const tokens = safeQ.split(/\s+/).filter(Boolean);
  const ftsQuery = tokens.length === 1
    ? `"${tokens[0]}"`
    : tokens.map(t => `"${t}"`).join(' OR ');

  let sections: any[] = [];
  let judgments: any[] = [];
  let lawsMap: Map<number, { law: any; hitCount: number }> = new Map();

  // ============ SECTIONS ============
  if (type === 'all' || type === 'sections') {
    let ftsRows: any[] = [];
    let ftsError: any = null;
    try {
      ftsRows = await db.$queryRaw<any[]>(Prisma.sql`
        SELECT s.section_id, s.law_id, s.article_key, s.section_number,
               s.section_text, s.is_labor_related, s.is_cancelled,
               l.law_name_th, l.category, l.is_labor_law,
               snippet(law_sections_fts, 0, '<<', '>>', '...', 24) as snippet
        FROM law_sections_fts
        JOIN law_sections s ON s.section_id = law_sections_fts.rowid
        JOIN laws l ON l.law_id = s.law_id
        WHERE law_sections_fts MATCH ${ftsQuery}
        ORDER BY rank
        LIMIT ${limit}
      `);
    } catch (e) {
      ftsError = e;
    }

    if (ftsRows.length > 0) {
      sections = ftsRows.map(r => ({
        type: 'section' as const,
        id: r.section_id,
        lawId: r.law_id,
        lawNameTh: r.law_name_th,
        category: r.category,
        isLaborLaw: r.is_labor_law === 1,
        articleKey: r.article_key,
        sectionNumber: r.section_number,
        snippet: r.snippet || (r.section_text || '').slice(0, 200),
        isLaborRelated: r.is_labor_related === 1,
      }));
    } else {
      // Fallback to LIKE search
      if (ftsError) console.error('[search] Section FTS failed:', ftsError);
      const likeRows = await db.lawSection.findMany({
        where: { sectionText: { contains: q } },
        take: limit,
        include: { law: true },
      });
      sections = likeRows.map(r => ({
        type: 'section' as const,
        id: r.sectionId,
        lawId: r.lawId,
        lawNameTh: r.law.lawNameTh,
        category: r.law.category,
        isLaborLaw: r.law.isLaborLaw === 1,
        articleKey: r.articleKey,
        sectionNumber: r.sectionNumber,
        snippet: r.sectionText.slice(0, 200),
        isLaborRelated: r.isLaborRelated === 1,
      }));
    }

    // Aggregate section hits by law (for showing related laws)
    for (const s of sections) {
      if (!lawsMap.has(s.lawId)) {
        lawsMap.set(s.lawId, {
          law: { lawId: s.lawId, lawNameTh: s.lawNameTh, category: s.category, isLaborLaw: s.isLaborLaw },
          hitCount: 0,
        });
      }
      lawsMap.get(s.lawId)!.hitCount += 1;
    }
  }

  // ============ JUDGMENTS ============
  if (type === 'all' || type === 'judgments') {
    let ftsRows: any[] = [];
    let ftsError: any = null;
    try {
      ftsRows = await db.$queryRaw<any[]>(Prisma.sql`
        SELECT j.judgment_id, j.case_number, j.case_year, j.category,
               j.title, j.fact, j.decision, j.source_url, j.license_note,
               s.source_name,
               snippet(case_judgments_fts, 0, '<<', '>>', '...', 32) as fact_snippet,
               snippet(case_judgments_fts, 1, '<<', '>>', '...', 16) as decision_snippet
        FROM case_judgments_fts
        JOIN case_judgments j ON j.judgment_id = case_judgments_fts.rowid
        LEFT JOIN sources s ON s.source_id = j.source_id
        WHERE case_judgments_fts MATCH ${ftsQuery}
        ORDER BY rank
        LIMIT ${limit}
      `);
    } catch (e) {
      ftsError = e;
    }

    if (ftsRows.length > 0) {
      judgments = ftsRows.map(r => ({
        type: 'judgment' as const,
        id: r.judgment_id,
        caseNumber: r.case_number,
        caseYear: r.case_year,
        category: r.category,
        title: r.title,
        snippet: r.fact_snippet || r.decision_snippet || (r.fact || '').slice(0, 200),
        sourceUrl: r.source_url,
        sourceName: r.source_name,
        licenseNote: r.license_note,
      }));
    } else {
      if (ftsError) console.error('[search] Judgment FTS failed:', ftsError);
      const likeRows = await db.caseJudgment.findMany({
        where: {
          OR: [
            { fact: { contains: q } },
            { decision: { contains: q } },
          ],
        },
        take: limit,
        include: { source: true },
      });
      judgments = likeRows.map(r => ({
        type: 'judgment' as const,
        id: r.judgmentId,
        caseNumber: r.caseNumber,
        caseYear: r.caseYear,
        category: r.category,
        title: r.title,
        snippet: (r.fact || r.decision || '').slice(0, 200),
        sourceUrl: r.sourceUrl,
        sourceName: r.source?.sourceName ?? null,
        licenseNote: r.licenseNote,
      }));
    }
  }

  // ============ LAWS (by name) ============
  let laws: any[] = [];
  if (type === 'all' || type === 'laws') {
    const lawRows = await db.law.findMany({
      where: { lawNameTh: { contains: q } },
      take: limit,
      include: { _count: { select: { sections: true } } },
    });
    laws = lawRows.map(l => ({
      type: 'law' as const,
      id: l.lawId,
      lawNameTh: l.lawNameTh,
      lawNameEn: l.lawNameEn,
      year: l.year,
      category: l.category,
      isLaborLaw: l.isLaborLaw === 1,
      sectionCount: l._count.sections,
    }));
    // Include laws that had section hits but weren't in the name match
    for (const [lawId, info] of lawsMap) {
      if (!laws.find(l => l.id === lawId)) {
        laws.push({
          type: 'law' as const,
          id: lawId,
          lawNameTh: info.law.lawNameTh,
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

  return NextResponse.json({
    sections,
    judgments,
    laws,
    total: sections.length + judgments.length + laws.length,
    q,
    type,
  });
}
