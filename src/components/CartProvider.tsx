"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { slug: string; name: string; pricePence: number; image: string; qty: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotalPence: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "sparkthunder-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, loaded]);

  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);

  const add = useCallback<CartCtx["add"]>((item, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.slug === item.slug);
      if (found) return cur.map((i) => (i.slug === item.slug ? { ...i, qty: Math.min(i.qty + qty, 20) } : i));
      return [...cur, { ...item, qty }];
    });
    setOpen(true);
  }, []);
  const setQty = useCallback((slug: string, qty: number) => {
    setItems((cur) => (qty <= 0 ? cur.filter((i) => i.slug !== slug) : cur.map((i) => (i.slug === slug ? { ...i, qty: Math.min(qty, 20) } : i))));
  }, []);
  const remove = useCallback((slug: string) => setItems((cur) => cur.filter((i) => i.slug !== slug)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(() => ({
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    subtotalPence: items.reduce((n, i) => n + i.qty * i.pricePence, 0),
    isOpen, openCart, closeCart, add, setQty, remove, clear,
  }), [items, isOpen, openCart, closeCart, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
