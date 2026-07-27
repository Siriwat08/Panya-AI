import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/judgments              — list (filter by category, page)
// GET /api/judgments?id=123       — judgment detail + related sections
// GET /api/judgments?law_id=1&section=119 — filter by law section
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category'); // 'labor' | 'criminal'
  const lawId = searchParams.get('law_id');
  const sectionId = searchParams.get('section_id');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50', 10), 200);
  const skip = (page - 1) * pageSize;

  if (id) {
    const judgmentId = parseInt(id, 10);
    if (isNaN(judgmentId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const judgment = await db.caseJudgment.findUnique({
      where: { judgmentId },
      include: { source: true },
    });
    if (!judgment) return NextResponse.json({ error: 'Judgment not found' }, { status: 404 });

    // Related sections via case_law_links
    const links = await db.caseLawLink.findMany({
      where: { judgmentId },
      include: {
        section: {
          include: { law: true },
        },
      },
      take: 50,
    });
    const relatedSections = links
      .filter(l => l.section)
      .map(l => ({
        sectionId: l.section!.sectionId,
        lawId: l.section!.lawId,
        lawNameTh: l.section!.law.lawNameTh,
        articleKey: l.section!.articleKey,
        sectionNumber: l.section!.sectionNumber,
        sectionText: l.section!.sectionText,
        isLaborRelated: l.section!.isLaborRelated,
        isCancelled: l.section!.isCancelled,
        chapter: l.section!.chapter,
        notes: l.section!.notes,
      }));

    return NextResponse.json({
      judgmentId: judgment.judgmentId,
      caseNumber: judgment.caseNumber,
      caseYear: judgment.caseYear,
      court: judgment.court,
      category: judgment.category,
      categoryCode: judgment.categoryCode,
      issueNumber: judgment.issueNumber,
      lawReferences: judgment.lawReferences,
      fact: judgment.fact,
      decision: judgment.decision,
      title: judgment.title,
      sourceId: judgment.sourceId,
      sourceUrl: judgment.sourceUrl,
      sourceName: judgment.source?.sourceName ?? null,
      sourceDescription: judgment.source?.description ?? null,
      licenseNote: judgment.licenseNote,
      relatedSections,
    });
  }

  // List mode
  const where: { category?: string } = {};
  if (category) where.category = category;

  let judgments;
  let total;

  if (sectionId) {
    // Filter by section link
    const sid = parseInt(sectionId, 10);
    const links = await db.caseLawLink.findMany({
      where: { sectionId: sid },
      select: { judgmentId: true },
    });
    const jids = links.map(l => l.judgmentId).filter(Boolean) as number[];
    [judgments, total] = await Promise.all([
      db.caseJudgment.findMany({
        where: { judgmentId: { in: jids }, ...(category ? { category } : {}) },
        include: { source: true },
        skip,
        take: pageSize,
        orderBy: { judgmentId: 'asc' },
      }),
      db.caseJudgment.count({
        where: { judgmentId: { in: jids }, ...(category ? { category } : {}) },
      }),
    ]);
  } else if (lawId) {
    // Filter by law via links
    const lid = parseInt(lawId, 10);
    const links = await db.caseLawLink.findMany({
      where: { lawId: lid },
      select: { judgmentId: true },
    });
    const jids = Array.from(new Set(links.map(l => l.judgmentId).filter(Boolean))) as number[];
    [judgments, total] = await Promise.all([
      db.caseJudgment.findMany({
        where: { judgmentId: { in: jids }, ...(category ? { category } : {}) },
        include: { source: true },
        skip,
        take: pageSize,
        orderBy: { judgmentId: 'asc' },
      }),
      db.caseJudgment.count({
        where: { judgmentId: { in: jids }, ...(category ? { category } : {}) },
      }),
    ]);
  } else {
    [judgments, total] = await Promise.all([
      db.caseJudgment.findMany({
        where,
        include: { source: true },
        skip,
        take: pageSize,
        orderBy: { judgmentId: 'asc' },
      }),
      db.caseJudgment.count({ where }),
    ]);
  }

  const result = judgments.map(j => ({
    judgmentId: j.judgmentId,
    caseNumber: j.caseNumber,
    caseYear: j.caseYear,
    category: j.category,
    title: j.title,
    fact: j.fact,
    decision: j.decision,
    sourceUrl: j.sourceUrl,
    sourceName: j.source?.sourceName ?? null,
    licenseNote: j.licenseNote,
  }));

  return NextResponse.json({
    data: result,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
