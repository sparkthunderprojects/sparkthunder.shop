"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Ctx = { slugs: string[]; has: (slug: string) => boolean; toggle: (slug: string) => void };
const WishCtx = createContext<Ctx | null>(null);
const KEY = "sparkthunder-wishlist-v1";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setSlugs(JSON.parse(raw)); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(slugs)); } catch {}
  }, [slugs, loaded]);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);
  const toggle = useCallback((slug: string) => setSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug])), []);
  const value = useMemo(() => ({ slugs, has, toggle }), [slugs, has, toggle]);
  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishCtx);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
