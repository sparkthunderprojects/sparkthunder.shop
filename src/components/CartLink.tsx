"use client";

import { useT } from "@/components/LocaleProvider";
import { useCart } from "@/components/CartProvider";

export function CartLink() {
  const { count, openCart } = useCart();
  const { t } = useT();
  return (
    <button onClick={openCart} className="relative flex h-10 w-10 items-center justify-center hover:bg-paper-2" aria-haspopup="dialog" aria-label={count === 1 ? t("Open basket, 1 item") : t("Open basket, {n} items", { n: count })}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2zM9 8V6a3 3 0 0 1 6 0v2" /></svg>
      {count > 0 && <span className="absolute -right-0.5 top-0 bg-bolt px-1 text-[0.7rem] font-extrabold leading-4 text-(--color-on-accent)">{count}</span>}
    </button>
  );
}
