"use client";

import { useT } from "@/components/LocaleProvider";
import { useId, useState } from "react";
import { useCart } from "@/components/CartProvider";

export function AddToCart({ item, inStock, onAdded }: { item: { slug: string; name: string; pricePence: number; image: string }; inStock: boolean; onAdded?: () => void }) {
  const { add } = useCart();
  const { t } = useT();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const id = useId();

  if (!inStock) return <button disabled className="btn w-full">{t("Sold out")}</button>;
  return (
    <div className="flex gap-3">
      <label className="sr-only" htmlFor={id}>{t("Quantity")}</label>
      <select id={id} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-20 border border-ink/20 bg-paper px-3 font-bold">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button onClick={() => { add(item, qty); setAdded(true); setTimeout(() => setAdded(false), 1800); onAdded?.(); }} className="btn flex-1" aria-live="polite">
        {added ? t("Added to basket") : t("Add to basket")}
      </button>
    </div>
  );
}
