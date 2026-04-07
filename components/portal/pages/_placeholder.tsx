"use client";

import { useEffect } from 'react';

export function PlaceholderPage({ title }: { title: string }) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 w-full max-w-md">
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">UI in progress</p>
        <h1 className="text-xl font-bold text-slate-800 mb-2">{title}</h1>
        <p className="text-sm text-slate-600">
          Halaman ini sudah terhubung ke route yang benar. Berikutnya kita isi UI pixel-close dari
          prototype `kgs.jsx`.
        </p>
      </div>
    </div>
  );
}

