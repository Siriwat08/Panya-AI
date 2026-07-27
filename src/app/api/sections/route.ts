import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sections?id=123 — section detail + related judgments
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const sectionId = parseInt(id, 10);
  if (isNaN(sectionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const section = await db.lawSection.findUnique({
    where: { sectionId },
    include: { law: true },
  });
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  // Find related judgments via case_law_links
  const links = await db.caseLawLink.findMany({
    where: { sectionId },
    include: {
      judgment: {
        include: {
          source: true,
        },
      },
    },
    take: 50,
  });

  const relatedJudgments = links
    .filter(l => l.judgment)
    .map(l => ({
      judgmentId: l.judgment!.judgmentId,
      caseNumber: l.judgment!.caseNumber,
      caseYear: l.judgment!.caseYear,
      category: l.judgment!.category,
      title: l.judgment!.title,
      fact: l.judgment!.fact,
      decision: l.judgment!.decision,
      sourceUrl: l.judgment!.sourceUrl,
      sourceName: l.judgment!.source?.sourceName ?? null,
      licenseNote: l.judgment!.licenseNote,
    }));

  return NextResponse.json({
    sectionId: section.sectionId,
    lawId: section.lawId,
    lawNameTh: section.law.lawNameTh,
    articleKey: section.articleKey,
    sectionNumber: section.sectionNumber,
    sectionText: section.sectionText,
    isLaborRelated: section.isLaborRelated,
    isCancelled: section.isCancelled,
    chapter: section.chapter,
    notes: section.notes,
    relatedJudgments,
  });
}
