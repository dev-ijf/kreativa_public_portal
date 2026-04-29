import { Header } from '@/components/portal/Header';

export default function FinanceLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Tuition" />
      <div className="px-4 pt-4 space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
        <div className="h-11 rounded-2xl bg-slate-200/90" />
        <div className="h-36 rounded-3xl bg-white border border-slate-100 shadow-sm" />
        <div className="h-52 rounded-3xl bg-white border border-slate-100 shadow-sm" />
        <div className="h-40 rounded-3xl bg-white border border-slate-100 shadow-sm" />
      </div>
    </div>
  );
}
