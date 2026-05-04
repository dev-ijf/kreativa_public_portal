import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import {
  isStudentVisibleToViewer,
  getAdaptiveHistoryPage,
  getAdaptiveHistoryStats,
  getAdaptiveSubjects,
  getMasteryPerSubject,
} from '@/lib/data/server/adaptive';

const DEFAULT_HISTORY_LIMIT = 5;

export async function GET(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = Number(searchParams.get('studentId'));
  if (!studentId || Number.isNaN(studentId)) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  const visible = await isStudentVisibleToViewer(userId, role, studentId);
  if (!visible) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const limitRaw = searchParams.get('historyLimit');
  const offsetRaw = searchParams.get('historyOffset');
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || DEFAULT_HISTORY_LIMIT));
  const offset = Math.max(0, Number(offsetRaw) || 0);

  const history = await getAdaptiveHistoryPage(studentId, limit, offset);

  if (offset === 0) {
    const [stats, subjects, masteryMap] = await Promise.all([
      getAdaptiveHistoryStats(studentId),
      getAdaptiveSubjects(),
      getMasteryPerSubject(studentId),
    ]);
    const historyTotal = stats.totalTests;
    return NextResponse.json({
      history,
      historyTotal,
      historyHasMore: offset + history.length < historyTotal,
      avgScore: stats.avgScore,
      totalTests: stats.totalTests,
      subjects,
      masteryMap,
    });
  }

  return NextResponse.json({ history });
}
