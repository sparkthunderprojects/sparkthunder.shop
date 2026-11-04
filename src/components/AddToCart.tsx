"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";

export function AddToCart({ item, inStock }: { item: { slug: string; name: string; pricePence: number; image: string }; inStock: boolean }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!inStock) {
    return <button disabled className="w-full cursor-not-allowed rounded-full bg-white/10 px-6 py-4 font-semibold text-white/50">Out of stock</button>;
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="qty">Quantity</label>
      <select id="qty" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="rounded-full border border-white/15 bg-transparent px-4 py-4">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n} className="text-black">{n}</option>)}
      </select>
      <button
        onClick={() => { add(item, qty); setAdded(true); setTimeout(() => setAdded(false), 1800); }}
        className="flex-1 rounded-full bg-accent px-6 py-4 font-semibold text-black transition hover:brightness-110"
      >
        {added ? "Added to basket ✓" : "Add to basket"}
      </button>
    </div>
  );
}
