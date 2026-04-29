"use client";

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PortalSelectedPaymentState } from '@/lib/data/portal-payment';
import type { PortalChildRow } from '@/lib/data/server/children';
import type { Lang } from '@/lib/portal-lang-cookie';
import { buildPortalLangCookieValue } from '@/lib/portal-lang-cookie';

export type { Lang };

export type CartItem = {
  id: string;
  childId: number;
  childName: string;
  type: 'tuition' | 'installment' | 'previous';
  title: string;
  amount: number;
};

export type PaymentMethod = PortalSelectedPaymentState;

type PortalState = {
  lang: Lang;
  setLang: Dispatch<SetStateAction<Lang>>;
  portalChildren: PortalChildRow[];
  activeChildId: number;
  setActiveChildId: Dispatch<SetStateAction<number>>;
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  selectedPayment: PaymentMethod | null;
  setSelectedPayment: Dispatch<SetStateAction<PaymentMethod | null>>;
};

const PortalContext = createContext<PortalState | null>(null);

type ProviderProps = {
  children: ReactNode;
  initialPortalChildren?: PortalChildRow[];
  /** Dari cookie server (`portal.lang`) agar teks bahasa pertama sama saat hidrasi. */
  initialLang?: Lang;
};

export function PortalProvider({ children, initialPortalChildren = [], initialLang }: ProviderProps) {
  const [lang, setLang] = useState<Lang>(() => (initialLang === 'en' || initialLang === 'id' ? initialLang : 'en'));
  const [portalChildren] = useState<PortalChildRow[]>(initialPortalChildren);
  const [activeChildId, setActiveChildId] = useState<number>(initialPortalChildren[0]?.id ?? 0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);

  const childIds = useMemo(() => new Set(portalChildren.map((c) => c.id)), [portalChildren]);

  useEffect(() => {
    try {
      const storedLang = window.localStorage.getItem('portal.lang') as Lang | null;
      const storedChild = window.localStorage.getItem('portal.activeChildId');
      const storedCart = window.localStorage.getItem('portal.cart');
      const storedPayment = window.localStorage.getItem('portal.selectedPayment');

      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedLang === 'en' || storedLang === 'id') {
        setLang(storedLang);
        document.cookie = buildPortalLangCookieValue(storedLang);
      }

      const parsedChild = storedChild ? Number(storedChild) : NaN;
      if (!Number.isNaN(parsedChild) && childIds.has(parsedChild)) {
        setActiveChildId(parsedChild);
      }

      if (storedCart) setCart(JSON.parse(storedCart) as CartItem[]);

      if (storedPayment) {
        try {
          const p = JSON.parse(storedPayment) as Partial<PaymentMethod>;
          if (
            typeof p.id === 'string' &&
            typeof p.dbMethodId === 'number' &&
            Number.isFinite(p.dbMethodId) &&
            typeof p.label === 'string' &&
            (p.type === 'va' || p.type === 'qris' || p.type === 'ewallet' || p.type === 'manual') &&
            (p.logoUrl === undefined || p.logoUrl === null || typeof p.logoUrl === 'string')
          ) {
            setSelectedPayment(p as PaymentMethod);
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      // ignore
    }
  }, [childIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem('portal.lang', lang);
      document.cookie = buildPortalLangCookieValue(lang);
    } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    try {
      window.localStorage.setItem('portal.activeChildId', String(activeChildId));
    } catch { /* ignore */ }
  }, [activeChildId]);

  useEffect(() => {
    try {
      window.localStorage.setItem('portal.cart', JSON.stringify(cart));
    } catch { /* ignore */ }
  }, [cart]);

  useEffect(() => {
    try {
      if (!selectedPayment) window.localStorage.removeItem('portal.selectedPayment');
      else window.localStorage.setItem('portal.selectedPayment', JSON.stringify(selectedPayment));
    } catch { /* ignore */ }
  }, [selectedPayment]);

  const value = useMemo(
    () => ({ lang, setLang, portalChildren, activeChildId, setActiveChildId, cart, setCart, selectedPayment, setSelectedPayment }),
    [lang, portalChildren, activeChildId, cart, selectedPayment],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortalState() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortalState must be used within PortalProvider');
  return ctx;
}

export function useActiveChild(): PortalChildRow | undefined {
  const { portalChildren, activeChildId } = usePortalState();
  return portalChildren.find((c) => c.id === activeChildId);
}

