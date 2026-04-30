import { InstructionPageClient } from '@/components/portal/pages/InstructionPageClient';

type PageProps = { params: Promise<{ vaNo: string }> };

export default async function Page({ params }: PageProps) {
  const { vaNo } = await params;
  return <InstructionPageClient vaNo={vaNo} />;
}
