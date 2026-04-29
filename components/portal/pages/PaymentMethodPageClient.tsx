"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2, QrCode, ReceiptText, Smartphone } from 'lucide-react';
import { FullPageBlockingLoader } from '@/components/portal/FullPageBlockingLoader';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import type {
  PortalCheckoutCartItem,
  PortalCheckoutSessionPayload,
  PortalPaymentInstructionRow,
  PortalPaymentMethodOption,
} from '@/lib/data/portal-payment';
import { PORTAL_CHECKOUT_SESSION_KEY } from '@/lib/data/portal-payment';
import { portalOptionToPaymentMethod } from '@/lib/utils/payment-method-ui';
import { formatRupiah } from '@/lib/utils/format';

type PaymentMethodPageClientProps = {
  initialMethods: PortalPaymentMethodOption[];
};

export function PaymentMethodPageClient({ initialMethods }: PaymentMethodPageClientProps) {
  const router = useRouter();
  const { lang, cart, selectedPayment, setSelectedPayment, setCart } = usePortalState();
  const total = cart.reduce((sum, i) => sum + i.amount, 0);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const methods = initialMethods.map(portalOptionToPaymentMethod);

  useEffect(() => {
    if (initialMethods.length !== 1) return;
    const only = portalOptionToPaymentMethod(initialMethods[0]);
    setSelectedPayment((cur) => (cur?.dbMethodId === only.dbMethodId ? cur : only));
  }, [initialMethods, setSelectedPayment]);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {submitting ? (
        <FullPageBlockingLoader
          title={lang === 'en' ? 'Processing checkout…' : 'Memproses checkout…'}
          subtitle={
            lang === 'en'
              ? 'Please wait. Do not close or refresh this page until finished.'
              : 'Mohon tunggu. Jangan tutup atau segarkan halaman ini sampai selesai.'
          }
        />
      ) : null}
      <Header title={lang === 'en' ? 'Payment Method' : 'Metode Pembayaran'} backHref="/cart" />

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Total Payment' : 'Total Pembayaran'}</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatRupiah(total)}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="font-bold text-slate-700 mb-4">{lang === 'en' ? 'Choose Payment Method' : 'Pilih Metode Pembayaran'}</p>
          {methods.length === 0 ? (
            <p className="text-sm text-slate-600">
              {lang === 'en' ? 'No payment methods available. Please contact the school.' : 'Belum ada metode pembayaran. Hubungi sekolah.'}
            </p>
          ) : (
            <div className="space-y-3">
              {methods.map((m) => {
                const active = selectedPayment?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedPayment(m)}
                    className={[
                      'w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all',
                      active ? 'border-primary bg-primary-light shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center min-w-0">
                      {m.logoUrl && /^https?:\/\//i.test(m.logoUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.logoUrl}
                          alt=""
                          className="w-10 h-10 rounded-xl object-contain mr-3 shrink-0 bg-white border border-slate-100"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={['w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0', active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'].join(' ')}
                        >
                          {m.type === 'va' ? (
                            <Building2 size={18} />
                          ) : m.type === 'qris' ? (
                            <QrCode size={18} />
                          ) : m.type === 'manual' ? (
                            <ReceiptText size={18} />
                          ) : (
                            <Smartphone size={18} />
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 truncate">{m.label}</p>
                      </div>
                    </div>
                    <span className={['text-sm font-bold shrink-0 ml-2', active ? 'text-primary' : 'text-slate-400'].join(' ')}>{active ? '✅' : '○'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {checkoutError ? (
            <p className="mt-3 text-sm text-red-600 font-medium" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!selectedPayment || submitting}
            onClick={() => {
              void (async () => {
                if (!selectedPayment || cart.length === 0) return;
                setCheckoutError(null);
                setSubmitting(true);
                try {
                  const res = await fetch('/api/portal/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      cart: cart as PortalCheckoutCartItem[],
                      paymentMethodId: selectedPayment.dbMethodId,
                    }),
                  });
                  const data = (await res.json().catch(() => ({}))) as {
                    error?: string;
                    messageId?: string;
                    messageEn?: string;
                    referenceNo?: string;
                    transactionId?: string;
                    transactionCreatedAt?: string;
                    studentId?: number;
                    totalAmount?: number;
                    vaNo?: string | null;
                    vaDisplay?: string | null;
                    expiryAt?: string;
                    isBmi?: boolean;
                    instructionRows?: PortalPaymentInstructionRow[];
                  };
                  if (!res.ok) {
                    const msg =
                      res.status === 422
                        ? lang === 'en'
                          ? data.messageEn ?? data.error ?? 'Checkout failed.'
                          : data.messageId ?? data.error ?? 'Checkout gagal.'
                        : lang === 'en'
                          ? 'Checkout failed. Try again.'
                          : 'Checkout gagal. Coba lagi.';
                    setCheckoutError(msg);
                    setSubmitting(false);
                    return;
                  }
                  const payload: PortalCheckoutSessionPayload = {
                    referenceNo: String(data.referenceNo ?? ''),
                    transactionId: String(data.transactionId ?? ''),
                    transactionCreatedAt: String(data.transactionCreatedAt ?? ''),
                    studentId:
                      typeof data.studentId === 'number' && Number.isFinite(data.studentId) && data.studentId > 0
                        ? data.studentId
                        : undefined,
                    totalAmount: typeof data.totalAmount === 'number' && Number.isFinite(data.totalAmount) ? data.totalAmount : undefined,
                    vaNo: data.vaNo ?? null,
                    vaDisplay: data.vaDisplay ?? null,
                    expiryAt: String(data.expiryAt ?? ''),
                    isBmi: Boolean(data.isBmi),
                    instructionRows: Array.isArray(data.instructionRows) ? data.instructionRows : undefined,
                    checkoutMethodId: selectedPayment.dbMethodId,
                  };
                  try {
                    sessionStorage.setItem(PORTAL_CHECKOUT_SESSION_KEY, JSON.stringify(payload));
                  } catch {
                    /* ignore */
                  }
                  setCart([]);
                  router.push('/instruction');
                  /* Spinner tetap sampai halaman /instruction menggantikan view ini. */
                } catch {
                  setCheckoutError(
                    lang === 'en' ? 'Network error. Check connection and try again.' : 'Jaringan error. Periksa koneksi lalu coba lagi.',
                  );
                  setSubmitting(false);
                }
              })();
            }}
            className={[
              'mt-4 w-full inline-flex items-center justify-center font-bold px-6 py-3 rounded-full transition-colors',
              selectedPayment && !submitting
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed',
            ].join(' ')}
          >
            {submitting ? (lang === 'en' ? 'Processing…' : 'Memproses…') : lang === 'en' ? 'Proceed Payment' : 'Lanjut'}{' '}
            <span className="ml-2">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
