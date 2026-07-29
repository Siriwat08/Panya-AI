import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/judgments              — list (filter by case_type, page)
// GET /api/judgments?id=123       — judgment detail + related sections
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category'); // 'แรงงาน' | 'แพ่ง' | etc.
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(Number.parseInt(searchParams.get('pageSize') || '30', 10), 100);
  const skip = (page - 1) * pageSize;

  if (id) {
    const judgmentId = Number.parseInt(id, 10);
    if (Number.isNaN(judgmentId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const judgment = await db.judgment.findUnique({
      where: { judgmentId },
      include: { source: true },
    });
    if (!judgment) return NextResponse.json({ error: 'Judgment not found' }, { status: 404 });

    // Related sections via cross_references table
    let relatedSections: any[] = []
    try {
      const refs = await db.crossReference.findMany({
        where: { sourceType: 'judgment', sourceId: judgmentId, targetType: 'law_section' },
        take: 30,
      })
      const sectionIds = refs.map(r => r.targetId).filter(Boolean) as number[]
      if (sectionIds.length > 0) {
        const sections = await db.lawSection.findMany({
          where: { sectionId: { in: sectionIds } },
          include: { law: true },
          take: 30,
        })
        relatedSections = sections.map(s => ({
          sectionId: s.sectionId,
          lawId: s.lawId,
          lawNameTh: s.law.title,
          articleKey: s.sectionNumberThai || `มาตรา ${s.sectionNumber}`,
          sectionNumber: s.sectionNumber,
          sectionText: s.sectionText,
          isLaborRelated: s.isLaborRelated,
          isCancelled: 0,
          chapter: s.chapter,
          notes: s.notes,
        }))
      }
    } catch (e) {
      // cross_references might be empty
    }

    return NextResponse.json({
      judgmentId: judgment.judgmentId,
      caseNumber: judgment.dekaNo,  // legacy alias
      dekaNo: judgment.dekaNo,
      caseYear: judgment.year,  // legacy alias
      year: judgment.year,
      court: 'ศาลฎีกา',
      category: judgment.caseType,
      caseType: judgment.caseType,
      categoryCode: null,
      issueNumber: null,
      lawReferences: judgment.lawsCited,  // legacy alias
      lawsCited: judgment.lawsCited,
      fact: judgment.fact,
      decision: judgment.ruling,  // legacy alias
      ruling: judgment.ruling,
      verdict: judgment.verdict,
      title: judgment.topic,
      topic: judgment.topic,
      sourceId: judgment.sourceId,
      sourceUrl: judgment.sourceUrl,
      sourceName: judgment.source?.sourceName ?? null,
      sourceDescription: judgment.source?.description ?? null,
      licenseNote: judgment.note,
      note: judgment.note,
      fullText: judgment.fullText,
      relatedSections,
    });
  }

  // List mode
  const where: { caseType?: string } = {};
  if (category) {
    // Support both Thai and English category names
    if (category === 'labor') where.caseType = 'แรงงาน';
    else if (category === 'criminal') where.caseType = 'อาญา';
    else where.caseType = category;
  }

  const [judgments, total] = await Promise.all([
    db.judgment.findMany({
      where,
      include: { source: true },
      skip,
      take: pageSize,
      orderBy: { judgmentId: 'asc' },
    }),
    db.judgment.count({ where }),
  ]);

  const result = judgments.map(j => ({
    judgmentId: j.judgmentId,
    caseNumber: j.dekaNo,  // legacy alias
    dekaNo: j.dekaNo,
    caseYear: j.year,  // legacy alias
    year: j.year,
    category: j.caseType,
    caseType: j.caseType,
    title: j.topic,
    topic: j.topic,
    fact: j.fact,
    decision: j.ruling,  // legacy alias
    ruling: j.ruling,
    sourceUrl: j.sourceUrl,
    sourceName: j.source?.sourceName ?? null,
    licenseNote: j.note,
    note: j.note,
  }));

  return NextResponse.json({
    data: result,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
