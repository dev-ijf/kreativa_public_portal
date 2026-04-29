import { Header } from '@/components/portal/Header';

export default function PaymentMethodLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Header title="Payment" />
      <div className="px-4 pt-4 space-y-3 animate-pulse" aria-busy="true" aria-label="Loading">
        <div className="h-24 rounded-3xl bg-white border border-slate-100 shadow-sm" />
        <div className="h-24 rounded-3xl bg-white border border-slate-100 shadow-sm" />
        <div className="h-24 rounded-3xl bg-white border border-slate-100 shadow-sm" />
        <div className="h-12 rounded-full bg-slate-200/90 mt-6" />
      </div>
    </div>
  );
}
