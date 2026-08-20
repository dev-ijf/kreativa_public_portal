import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getAnnouncementsPage, type AnnouncementPageCursor } from '@/lib/data/server/announcements';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const publishDate = searchParams.get('cursorPublishDate');
  const id = searchParams.get('cursorId');
  const cursor: AnnouncementPageCursor | null =
    publishDate && id ? { publishDate, id } : null;
  const limitRaw = Number(searchParams.get('limit') ?? 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

  const { rows, nextCursor } = await getAnnouncementsPage(userId, role, {
    limit,
    cursor,
  });

  return NextResponse.json({ rows, nextCursor });
}
