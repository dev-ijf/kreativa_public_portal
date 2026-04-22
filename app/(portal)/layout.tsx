import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { PortalProvider } from '@/components/portal/state/PortalProvider';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PortalProvider>
        <div className="min-h-screen bg-slate-50 text-slate-800">
          <div className="min-h-screen w-full flex justify-center">
            <div className="w-full max-w-[420px] sm:border sm:border-slate-200/70 sm:shadow-sm overflow-hidden bg-slate-50">
              {children}
            </div>
          </div>
        </div>
      </PortalProvider>
    </AuthProvider>
  );
}

