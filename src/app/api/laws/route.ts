import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/laws             — list all laws (with section count)
// GET /api/laws?id=123      — single law detail (with sections)
// GET /api/laws?id=123&q=xxx — single law + filter sections by keyword
// GET /api/laws?labor=1     — only labor laws (category=labor)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const laborOnly = searchParams.get('labor') === '1';
  const q = searchParams.get('q')?.trim();

  if (id) {
    const lawId = Number.parseInt(id, 10);
    if (Number.isNaN(lawId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const law = await db.law.findUnique({
      where: { lawId },
      include: {
        sections: {
          where: q
            ? {
                OR: [
                  { sectionText: { contains: q } },
                  { sectionNumber: { contains: q } },
                  { sectionNumberThai: { contains: q } },
                ],
              }
            : undefined,
          orderBy: { sectionId: 'asc' },
          select: {
            sectionId: true,
            lawId: true,
            sectionNumber: true,
            sectionNumberThai: true,
            sectionText: true,
            isLaborRelated: true,
            chapter: true,
            notes: true,
          },
        },
      },
    });
    if (!law) {
      return NextResponse.json({ error: 'Law not found' }, { status: 404 });
    }

    // Fetch related judgments via cross_references table
    let relatedJudgments: Array<{
      judgmentId: number;
      judgmentCode: string;
      dekaNo: string | null;
      year: string | null;
      topic: string | null;
    }> = [];
    try {
      const refsToLaw = await db.crossReference.findMany({
        where: { targetType: 'law', targetId: lawId },
        select: { sourceType: true, sourceId: true, sourceCode: true, sectionRef: true },
        take: 100,
      });
      const templateIds = refsToLaw
        .filter(r => r.sourceType === 'contract_template' && r.sourceId)
        .map(r => r.sourceId);

      if (templateIds.length > 0) {
        const judRefs = await db.crossReference.findMany({
          where: {
            sourceType: 'contract_template',
            sourceId: { in: templateIds as number[] },
            targetType: 'judgment',
            targetId: { not: null },
          },
          select: { targetId: true },
          distinct: ['targetId'],
          take: 30,
        });
        const judIds = judRefs.map(r => r.targetId).filter(Boolean) as number[];
        if (judIds.length > 0) {
          const judgments = await db.judgment.findMany({
            where: { judgmentId: { in: judIds } },
            select: {
              judgmentId: true,
              judgmentCode: true,
              dekaNo: true,
              year: true,
              topic: true,
            },
            take: 20,
            orderBy: { year: 'desc' },
          });
          relatedJudgments = judgments;
        }
      }
    } catch (e) {
      console.warn('[laws] cross_references query failed:', e instanceof Error ? e.message : String(e));
    }

    // Map to legacy field names for frontend compatibility
    return NextResponse.json({
      ...law,
      lawNameTh: law.title,  // legacy alias
      lawNameEn: null,
      isLaborLaw: law.category === 'labor' ? 1 : 0,  // legacy alias
      relatedJudgments,
    });
  }

  // List all laws
  const laws = await db.law.findMany({
    where: laborOnly ? { category: 'labor' } : undefined,
    orderBy: { lawId: 'asc' },
    include: {
      _count: { select: { sections: true } },
      sections: {
        where: { isLaborRelated: 1 },
        select: { sectionId: true },
      },
    },
  });
  const result = laws.map(l => ({
    lawId: l.lawId,
    lawCode: l.lawCode,
    title: l.title,
    lawNameTh: l.title,  // legacy alias for frontend
    lawNameEn: null,
    year: l.year,
    category: l.category,
    isLaborLaw: l.category === 'labor' ? 1 : 0,  // legacy alias
    status: l.status,
    sourceUrl: l.sourceUrl,
    sectionCount: l._count.sections,
    laborSectionCount: l.sections.length,
  }));
  return NextResponse.json(result);
}
