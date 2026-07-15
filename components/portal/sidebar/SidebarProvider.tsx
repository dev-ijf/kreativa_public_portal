"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type SidebarState = {
  expanded: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

const STORAGE_KEY = 'portal.sidebarExpanded';
const DESKTOP_MQ = '(min-width: 1024px)';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_MQ);
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === 'true' || stored === 'false') {
      setExpanded(stored === 'true');
    } else {
      setExpanded(mql.matches);
    }
    setHydrated(true);

    const handler = (e: MediaQueryListEvent) => {
      setExpanded(e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch { /* ignore */ }
  }, [expanded, hydrated]);

  const toggle = useCallback(() => setExpanded((v) => !v), []);
  const collapse = useCallback(() => setExpanded(false), []);
  const expand = useCallback(() => setExpanded(true), []);

  const value = useMemo(
    () => ({ expanded, toggle, collapse, expand }),
    [expanded, toggle, collapse, expand],
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
