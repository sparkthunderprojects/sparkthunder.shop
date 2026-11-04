"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { QuickProduct } from "@/lib/card";

export type CompareItem = { slug: string; name: string; image: string };
export const COMPARE_MAX = 4;
const KEY = "sparkthunder-compare-v1";

type Ctx = {
  quick: QuickProduct | null;
  openQuick: (p: QuickProduct) => void;
  closeQuick: () => void;
  compare: CompareItem[];
  inCompare: (slug: string) => boolean;
  toggleCompare: (item: CompareItem) => void;
  removeCompare: (slug: string) => void;
  clearCompare: () => void;
  notice: string;
};

const ShopUiCtx = createContext<Ctx | null>(null);

/** Quick-view modal state and the compare list (kept in localStorage, max four products). */
export function ShopUiProvider({ children }: { children: React.ReactNode }) {
  const [quick, setQuick] = useState<QuickProduct | null>(null);
  const [compare, setCompare] = useState<CompareItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCompare(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(compare)); } catch {}
  }, [compare, loaded]);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 3000);
  }, []);

  const toggleCompare = useCallback((item: CompareItem) => {
    setCompare((cur) => {
      if (cur.some((c) => c.slug === item.slug)) return cur.filter((c) => c.slug !== item.slug);
      if (cur.length >= COMPARE_MAX) {
        flash(`You can compare up to ${COMPARE_MAX} products. Remove one first.`);
        return cur;
      }
      return [...cur, item];
    });
  }, [flash]);

  const value = useMemo<Ctx>(() => ({
    quick,
    openQuick: setQuick,
    closeQuick: () => setQuick(null),
    compare,
    inCompare: (slug) => compare.some((c) => c.slug === slug),
    toggleCompare,
    removeCompare: (slug) => setCompare((cur) => cur.filter((c) => c.slug !== slug)),
    clearCompare: () => setCompare([]),
    notice,
  }), [quick, compare, toggleCompare, notice]);

  return <ShopUiCtx.Provider value={value}>{children}</ShopUiCtx.Provider>;
}

export function useShopUi() {
  const ctx = useContext(ShopUiCtx);
  if (!ctx) throw new Error("useShopUi must be used inside ShopUiProvider");
  return ctx;
}
