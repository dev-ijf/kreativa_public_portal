import { getCachedServerSession } from '@/lib/auth-cached';
import { isReportOwnedByUser } from '@/lib/data/server/report-cards';
import { loadTermReportFull } from '@/lib/report-card/queries';
import { streamPdfResponse } from '@/lib/report-card/pdf-stream';
import { drawTermReportPdf } from '@/lib/report-card/pdf-term';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const reportId = Number(id);
  if (!reportId || !Number.isFinite(reportId)) {
    return new Response('Invalid report ID', { status: 400 });
  }

  const data = await loadTermReportFull(reportId);
  if (!data) {
    return new Response('Report not found', { status: 404 });
  }

  if (data.card.status !== 'published') {
    return new Response('Report not published', { status: 403 });
  }

  const owned = await isReportOwnedByUser(userId, role, data.card.student_id);
  if (!owned) {
    return new Response('Forbidden', { status: 403 });
  }

  const filename = `term-report-${data.context.term_name.replace(/\s+/g, '')}-${data.context.student_name.replace(/\s+/g, '_')}.pdf`;

  return streamPdfResponse(request.url, filename, async (doc) => {
    await drawTermReportPdf(doc, data, request.url);
  });
}
