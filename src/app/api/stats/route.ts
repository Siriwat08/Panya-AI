import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const [
    totalLaws,
    totalSections,
    totalJudgments,
    totalLaborSections,
    totalLaborJudgments,
    totalCriminalJudgments,
    laborLawCount,
    caseLawLinks,
    ragChunks,
  ] = await Promise.all([
    db.law.count(),
    db.lawSection.count(),
    db.caseJudgment.count(),
    db.lawSection.count({ where: { isLaborRelated: 1 } }),
    db.caseJudgment.count({ where: { category: 'labor' } }),
    db.caseJudgment.count({ where: { category: 'criminal' } }),
    db.law.count({ where: { isLaborLaw: 1 } }),
    db.caseLawLink.count(),
    db.ragChunk.count(),
  ]);

  // Laws by category with section counts
  const laws = await db.law.findMany({
    select: {
      lawId: true,
      category: true,
      isLaborLaw: true,
      sections: { select: { sectionId: true, isLaborRelated: true } },
    },
  });
  const byCat: Record<string, { count: number; sectionCount: number; laborSectionCount: number }> = {};
  for (const l of laws) {
    const cat = l.category || 'other';
    if (!byCat[cat]) byCat[cat] = { count: 0, sectionCount: 0, laborSectionCount: 0 };
    byCat[cat].count += 1;
    byCat[cat].sectionCount += l.sections.length;
    byCat[cat].laborSectionCount += l.sections.filter(s => s.isLaborRelated).length;
  }
  const lawsByCategory = Object.entries(byCat).map(([category, v]) => ({
    category,
    count: v.count,
    sectionCount: v.sectionCount,
    laborSectionCount: v.laborSectionCount,
  }));

  return NextResponse.json({
    totalLaws,
    totalSections,
    totalJudgments,
    totalLaborSections,
    totalLaborJudgments,
    totalCriminalJudgments,
    laborLawCount,
    caseLawLinks,
    ragChunks,
    lawsByCategory,
  });
}
