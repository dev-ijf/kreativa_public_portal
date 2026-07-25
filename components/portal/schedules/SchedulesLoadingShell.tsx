'use client';

import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { FullPageBlockingLoader } from '@/components/portal/FullPageBlockingLoader';

type Props = {
  title: string;
  loadingTitle: string;
  loadingSubtitle: string;
};

export function SchedulesLoadingShell({ title, loadingTitle, loadingSubtitle }: Props) {
  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-6">
      <Header title={title} backHref="/" />
      <ChildSelector />
      <div className="px-4">
        <FullPageBlockingLoader title={loadingTitle} subtitle={loadingSubtitle} />
      </div>
    </div>
  );
}
