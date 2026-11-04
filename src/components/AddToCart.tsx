"use client";

import { useId, useState } from "react";
import { useCart } from "@/components/CartProvider";

export function AddToCart({ item, inStock, onAdded }: { item: { slug: string; name: string; pricePence: number; image: string }; inStock: boolean; onAdded?: () => void }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const id = useId();

  if (!inStock) return <button disabled className="btn w-full">Sold out</button>;
  return (
    <div className="flex gap-3">
      <label className="sr-only" htmlFor={id}>Quantity</label>
      <select id={id} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-20 border-2 border-ink bg-paper px-3 font-bold">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button onClick={() => { add(item, qty); setAdded(true); setTimeout(() => setAdded(false), 1800); onAdded?.(); }} className="btn flex-1" aria-live="polite">
        {added ? "Added to basket" : "Add to basket"}
      </button>
    </div>
  );
}
