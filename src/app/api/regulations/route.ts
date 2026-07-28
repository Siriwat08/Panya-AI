import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/regulations                    — list (active only by default)
// GET /api/regulations?status=repealed    — list repealed only
// GET /api/regulations?status=all         — list all
// GET /api/regulations?id=123             — single regulation detail
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'active'; // active | repealed | all
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '30', 10), 100);
  const skip = (page - 1) * pageSize;

  if (id) {
    const regulationId = parseInt(id, 10);
    if (isNaN(regulationId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const regulation = await db.regulation.findUnique({ where: { regulationId } });
    if (!regulation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(regulation);
  }

  // Build where clause
  const where: any = {};
  if (category) where.category = category;
  if (status === 'active') {
    where.repealStatus = 'active';
  } else if (status === 'repealed') {
    where.repealStatus = 'repealed';
  }
  // status === 'all' → no filter

  const [items, total] = await Promise.all([
    db.regulation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { regulationId: 'asc' },
      select: {
        regulationId: true, regulationCode: true, title: true,
        category: true, issuingBody: true, year: true,
        issueDate: true, charsCount: true, sourceUrl: true,
        isRepealed: true, repealStatus: true,
      },
    }),
    db.regulation.count({ where }),
  ]);

  return NextResponse.json({
    data: items,
    page, pageSize, total,
    totalPages: Math.ceil(total / pageSize),
    filter: { status, category },
  });
}
