"use client";

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'en' | 'id';

export type CartItem = {
  id: string;
  childId: number;
  childName: string;
  type: 'tuition' | 'installment' | 'previous';
  title: string;
  amount: number;
};

export type PaymentMethod = {
  id: string;
  label: string;
  sublabel?: string;
  type: 'va' | 'qris' | 'ewallet' | 'manual';
};

type PortalState = {
  lang: Lang;
  setLang: Dispatch<SetStateAction<Lang>>;
  activeChildId: number;
  setActiveChildId: Dispatch<SetStateAction<number>>;
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  selectedPayment: PaymentMethod | null;
  setSelectedPayment: Dispatch<SetStateAction<PaymentMethod | null>>;
};

const PortalContext = createContext<PortalState | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  // Important for SSR hydration:
  // keep initial values deterministic (server === client), then sync from localStorage after mount.
  const [lang, setLang] = useState<Lang>('en');
  const [activeChildId, setActiveChildId] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    try {
      const storedLang = window.localStorage.getItem('portal.lang') as Lang | null;
      const storedChild = window.localStorage.getItem('portal.activeChildId');
      const storedCart = window.localStorage.getItem('portal.cart');
      const storedPayment = window.localStorage.getItem('portal.selectedPayment');

      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedLang === 'en' || storedLang === 'id') setLang(storedLang);

      const parsedChild = storedChild ? Number(storedChild) : NaN;
      if (!Number.isNaN(parsedChild) && parsedChild > 0) setActiveChildId(parsedChild);

      if (storedCart) setCart(JSON.parse(storedCart) as CartItem[]);

      if (storedPayment) setSelectedPayment(JSON.parse(storedPayment) as PaymentMethod);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('portal.lang', lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  useEffect(() => {
    try {
      window.localStorage.setItem('portal.activeChildId', String(activeChildId));
    } catch {
      // ignore storage errors
    }
  }, [activeChildId]);

  useEffect(() => {
    try {
      window.localStorage.setItem('portal.cart', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      if (!selectedPayment) window.localStorage.removeItem('portal.selectedPayment');
      else window.localStorage.setItem('portal.selectedPayment', JSON.stringify(selectedPayment));
    } catch {
      // ignore storage errors
    }
  }, [selectedPayment]);

  const value = useMemo(
    () => ({ lang, setLang, activeChildId, setActiveChildId, cart, setCart, selectedPayment, setSelectedPayment }),
    [lang, activeChildId, cart, selectedPayment],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortalState() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortalState must be used within PortalProvider');
  return ctx;
}

