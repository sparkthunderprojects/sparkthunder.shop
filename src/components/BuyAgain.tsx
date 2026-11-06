"use client";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

export type AgainLine = { slug: string; variant?: string; name: string; pricePence: number; image: string; qty: number };

/** Puts the items from a past order back in the basket at today's price. Items that have gone are left out. */
export function BuyAgain({ lines, missing }: { lines: AgainLine[]; missing: number }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  if (lines.length === 0) return missing ? <p className="mt-3 text-sm text-muted">These items are no longer available.</p> : null;
  return (
    <div className="mt-3">
      <button className="btn btn-ink btn-sm" onClick={() => {
        lines.forEach((l) => add({ slug: l.variant ? `${l.slug}::${l.variant}` : l.slug, name: l.name, pricePence: l.pricePence, image: l.image, href: `/products/${l.slug}`, ...(l.variant ? { variant: l.variant } : {}) }, l.qty));
        setDone(true); setTimeout(() => setDone(false), 2000);
      }}>{done ? "Added to basket ✓" : "Buy it again"}</button>
      {missing ? <span className="ml-3 text-sm text-muted">{missing} {missing === 1 ? "item is" : "items are"} no longer available.</span> : null}
    </div>
  );
}
