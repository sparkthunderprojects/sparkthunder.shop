"use client";

import { useT } from "@/components/LocaleProvider";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import type { QuickProduct } from "@/lib/card";

export type Panel = "wishlist" | "recent" | "search";

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
  panel: Panel | null;
  openPanel: (p: Panel) => void;
  closePanel: () => void;
};

const ShopUiCtx = createContext<Ctx | null>(null);

/** Quick-view modal state and the compare list (kept in localStorage, max four products). */
export function ShopUiProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const [quick, setQuick] = useState<QuickProduct | null>(null);
  const [compare, setCompare] = useState<CompareItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel | null>(null);
  const { isOpen: cartOpen, closeCart } = useCart();
  const pathname = usePathname();
  const openPanel = useCallback((p: Panel) => { closeCart(); setPanel(p); }, [closeCart]);
  const closePanel = useCallback(() => setPanel(null), []);
  useEffect(() => { if (cartOpen) setPanel(null); }, [cartOpen]);
  useEffect(() => setPanel(null), [pathname]);
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
        flash(t("You can compare up to {n} products. Remove one first.", { n: COMPARE_MAX }));
        return cur;
      }
      return [...cur, item];
    });
  }, [flash, t]);

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
    panel, openPanel, closePanel,
  }), [quick, compare, toggleCompare, notice, panel, openPanel, closePanel]);

  return <ShopUiCtx.Provider value={value}>{children}</ShopUiCtx.Provider>;
}

export function useShopUi() {
  const ctx = useContext(ShopUiCtx);
  if (!ctx) throw new Error("useShopUi must be used inside ShopUiProvider");
  return ctx;
}
