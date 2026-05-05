"use client";

import { usePortalState } from '@/components/portal/state/PortalProvider';

export function ChildSelector() {
  const { lang, portalChildren, activeChildId, setActiveChildId } = usePortalState();

  if (portalChildren.length === 0) return null;

  return (
    <div className="px-4 mb-3 mt-1">
      <p className="text-[10px] font-bold mb-1.5 uppercase tracking-wide text-primary">
        {lang === 'en' ? 'Select Child Profile' : 'Pilih Profil Anak'}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5">
        {portalChildren.map((child) => {
          const isActive = activeChildId === child.id;
          const label = [child.fullName, child.className ?? '—', child.schoolName].join(' · ');
          return (
            <button
              key={child.id}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => setActiveChildId(child.id)}
              className={[
                'shrink-0 flex flex-col items-stretch text-left w-[min(100%,9.25rem)] px-2 py-1.5 rounded-xl border transition-colors',
                isActive
                  ? 'border-primary bg-primary-light ring-1 ring-primary/15'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80',
              ].join(' ')}
            >
              <span
                className={['font-semibold text-[13px] leading-tight tracking-tight truncate', isActive ? 'text-primary' : 'text-slate-800'].join(
                  ' ',
                )}
              >
                {child.fullName}
              </span>
              <span className="text-[9px] leading-tight text-slate-500 mt-0.5 truncate">{child.className ?? '—'}</span>
              <span className="text-[11px] font-medium leading-tight text-slate-600 mt-px truncate">{child.schoolName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
