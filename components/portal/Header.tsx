"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  title: string;
  backHref?: string;
  rightSlot?: ReactNode;
  transparent?: boolean;
};

export function Header({ title, backHref, rightSlot, transparent = false }: Props) {
  const pathname = usePathname();
  const resolvedBackHref = backHref ?? (pathname === '/' ? undefined : '/');

  return (
    <div
      className={[
        'px-4 py-4 flex items-center sticky top-0 z-20 transition-all',
        transparent ? 'bg-transparent' : 'bg-white shadow-sm',
      ].join(' ')}
    >
      {resolvedBackHref ? (
        <Link
          href={resolvedBackHref}
          className={[
            'mr-3 p-1.5 rounded-full transition-colors',
            transparent ? 'bg-white/20 text-white hover:bg-white/30' : 'hover:bg-slate-100 text-slate-700',
          ].join(' ')}
          aria-label="Back"
        >
          <span className="text-xl leading-none">‹</span>
        </Link>
      ) : null}

      <h1 className={['text-lg font-bold flex-1', transparent ? 'text-white' : 'text-slate-700'].join(' ')}>
        {title}
      </h1>

      {rightSlot ? <div className="flex items-center">{rightSlot}</div> : null}
    </div>
  );
}

