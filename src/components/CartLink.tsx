"use client";

import { useCart } from "@/components/CartProvider";

export function CartLink() {
  const { count, openCart } = useCart();
  return (
    <button onClick={openCart} className="btn btn-ink btn-sm" aria-haspopup="dialog" aria-label={`Open basket, ${count} item${count === 1 ? "" : "s"}`}>
      Basket
      {count > 0 && <span className="bg-bolt px-1.5 py-0.5 text-xs font-extrabold text-ink">{count}</span>}
    </button>
  );
}
