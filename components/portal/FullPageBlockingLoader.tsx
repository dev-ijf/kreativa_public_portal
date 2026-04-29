/**
 * Overlay full-viewport + spinner (blokir interaksi). Tanpa `"use client"` agar bisa dipakai dari `loading.tsx` (RSC).
 */

type FullPageBlockingLoaderProps = {
  title: string;
  subtitle?: string;
};

export function FullPageBlockingLoader({ title, subtitle }: FullPageBlockingLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-[2px] px-5"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-[min(22rem,calc(100vw-2.5rem))] rounded-3xl bg-white p-8 shadow-2xl border border-slate-200 flex flex-col items-center text-center">
        <div
          className="h-14 w-14 rounded-full border-[5px] border-primary/20 border-t-primary animate-spin shrink-0"
          aria-hidden
        />
        <p className="mt-6 text-base font-bold text-slate-800">{title}</p>
        {subtitle ? <p className="mt-2 text-sm text-slate-600 leading-relaxed">{subtitle}</p> : null}
      </div>
    </div>
  );
}
