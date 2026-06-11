import { getCachedServerSession } from '@/lib/auth-cached';
import {
  getPublishedTermReports,
  getPublishedSemesterReports,
} from '@/lib/data/server/report-cards';
import { ReportPageClient } from '@/components/portal/pages/ReportPageClient';

export default async function Page() {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  let termReports: Awaited<ReturnType<typeof getPublishedTermReports>> = [];
  let semesterReports: Awaited<ReturnType<typeof getPublishedSemesterReports>> = [];

  if (userId) {
    [termReports, semesterReports] = await Promise.all([
      getPublishedTermReports(userId, role),
      getPublishedSemesterReports(userId, role),
    ]);
  }

  return (
    <ReportPageClient
      termReports={termReports}
      semesterReports={semesterReports}
    />
  );
}
