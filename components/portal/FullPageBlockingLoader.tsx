'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type FullPageBlockingLoaderProps = {
  title: string;
  subtitle?: string;
};

function LoaderCard({ title, subtitle }: FullPageBlockingLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-5 bg-black/45"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-modal="true"
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

/**
 * Full-viewport blocking overlay. Portals to document.body so portal shell
 * `overflow-hidden` / max-width do not clip it.
 */
export function FullPageBlockingLoader({ title, subtitle }: FullPageBlockingLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    // SSR / first paint: still render fixed overlay in place (avoids blank flash).
    return <LoaderCard title={title} subtitle={subtitle} />;
  }

  return createPortal(<LoaderCard title={title} subtitle={subtitle} />, document.body);
}
