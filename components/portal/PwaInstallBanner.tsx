'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { getPwaAppNames, resolvePortalTenantFromHost, type PortalTenantId } from '@/lib/portal/tenant';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Props = {
  logoUrl: string;
  tenant?: PortalTenantId;
};

function dismissKey(tenant: PortalTenantId): string {
  return `pwa-install-dismissed:${tenant}`;
}

export function PwaInstallBanner({ logoUrl, tenant: tenantProp }: Props) {
  const { lang } = usePortalState();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const tenant =
    tenantProp ??
    (typeof window !== 'undefined'
      ? resolvePortalTenantFromHost(window.location.hostname)
      : 'kreativa');
  const { shortName } = getPwaAppNames(tenant);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (window.localStorage.getItem(dismissKey(tenant)) === '1') return;
    } catch {
      // ignore storage errors
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [tenant]);

  if (!visible || !deferred) return null;

  const title = lang === 'id' ? 'Pasang aplikasi' : 'Install app';
  const subtitle =
    lang === 'id'
      ? `Tambahkan ${shortName} ke layar utama`
      : `Add ${shortName} to your home screen`;
  const installLabel = lang === 'id' ? 'Pasang' : 'Install';

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(dismissKey(tenant), '1');
    } catch {
      // ignore
    }
  };

  const install = async () => {
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl object-contain bg-slate-50 border border-slate-100"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 leading-tight">{title}</p>
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-white hover:brightness-105 active:brightness-95"
        >
          <Download size={14} />
          {installLabel}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={lang === 'id' ? 'Tutup' : 'Dismiss'}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
