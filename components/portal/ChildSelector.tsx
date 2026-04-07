"use client";

import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_CHILDREN } from '@/lib/data/mock/home';

export function ChildSelector() {
  const { lang, activeChildId, setActiveChildId } = usePortalState();

  return (
    <div className="px-4 mb-5 mt-2">
      <p className="text-xs font-bold mb-3 uppercase tracking-wider text-primary">
        {lang === 'en' ? 'Select Child Profile' : 'Pilih Profil Anak'}
      </p>
      <div className="flex space-x-3 overflow-x-auto pb-2">
        {MOCK_CHILDREN.map((child) => (
          <button
            key={child.id}
            onClick={() => setActiveChildId(child.id)}
            className={[
              'shrink-0 flex items-center p-2 pr-4 rounded-full border transition-all',
              activeChildId === child.id
                ? 'border-primary bg-primary-light shadow-sm'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200',
            ].join(' ')}
          >
            <div
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center mr-2 text-lg',
                activeChildId === child.id ? 'bg-primary text-white border-2 border-primary-light' : 'bg-slate-100 text-slate-500',
              ].join(' ')}
            >
              {child.avatar}
            </div>
            <div className="text-left">
              <p className={['font-bold text-sm leading-tight', activeChildId === child.id ? 'text-primary' : 'text-slate-700'].join(' ')}>
                {child.name.split(' ')[0]}
              </p>
              <p className="text-[10px] text-slate-500 -mt-0.5">{child.gradeLabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

