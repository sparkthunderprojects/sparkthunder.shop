"use client";

import { useId, useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { QuickProduct } from "@/lib/card";
import { findVariant, optionGroups } from "@/lib/variants";
import { formatPrice } from "@/lib/site";
import { SizeGuide } from "@/components/SizeGuide";
import { StockAlertForm } from "@/components/StockAlertForm";
import { Countdown, useNow } from "@/components/Countdown";
import { isUpcoming } from "@/lib/launch";

/** Option pickers (size, colour...), quantity and add-to-basket for one product. Used by quick view and the product page. */
export function BuyBox({ product, onAdded }: { product: QuickProduct; onAdded?: () => void }) {
  const { add } = useCart();
  const id = useId();
  const vs = product.variants;
  const og = useMemo(() => optionGroups(vs), [vs]);
  const [picked, setPicked] = useState<(string | null)[]>(() => og.groups.map((g) => (vs.length === 1 ? g[0] : null)));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [warn, setWarn] = useState(false);

  const chosen = vs.length ? findVariant(vs, og, picked) : null;
  const avail = (v: { stockQty: number }) => !product.trackStock || v.stockQty > 0;
  const price = chosen?.pricePence ?? product.pricePence;
  const sold = !product.inStock || (chosen ? !avail(chosen) : false);

  // Is this option (given what is already picked in the other group) purchasable?
  const optionAvailable = (gi: number, value: string) => {
    const trial = picked.map((p, i) => (i === gi ? value : p));
    if (!og.split) return vs.some((v) => v.name === value && avail(v));
    return vs.some((v) => { const prt = v.name.split("/").map((x) => x.trim()); const match = (a: string | null, b: string) => !a || a === b;
      return avail(v) && ((match(trial[0], prt[0]) && match(trial[1], prt[1])) || (match(trial[0], prt[1]) && match(trial[1], prt[0]))); });
  };

  function submit() {
    if (vs.length && !chosen) { setWarn(true); return; }
    add({
      slug: chosen ? `${product.slug}::${chosen.name}` : product.slug,
      name: chosen ? `${product.name} - ${chosen.name}` : product.name,
      pricePence: price, image: product.image, href: `/products/${product.slug}`, ...(chosen ? { variant: chosen.name } : {}),
    }, qty);
    setAdded(true); setTimeout(() => setAdded(false), 1800); onAdded?.();
  }

  const now = useNow(Boolean(product.launchAt));
  if (isUpcoming(product.launchAt, now)) return (
    <div className="space-y-3">
      <Countdown to={product.launchAt!} />
      <button disabled className="btn w-full">Coming soon</button>
    </div>
  );
  if (!product.inStock) return (
    <div className="space-y-3">
      <button disabled className="btn w-full">Sold out</button>
      <StockAlertForm slug={product.slug} variant="" label={product.name} />
    </div>
  );
  return (
    <div>
      {vs.length > 0 ? og.groups.map((g, gi) => (
        <fieldset key={og.labels[gi]} className="mb-5">
          <legend className="mb-2 flex w-full items-center gap-2 font-bold">{og.labels[gi]}{picked[gi] ? <span className="font-normal text-muted">{picked[gi]}</span> : null}{og.labels[gi] === "Size" && product.categorySlug === "apparel" ? <span className="ml-auto font-normal"><SizeGuide /></span> : null}</legend>
          <div className="flex flex-wrap gap-2">
            {g.map((value) => {
              const ok = optionAvailable(gi, value), on = picked[gi] === value;
              return (
                <button key={value} type="button" aria-pressed={on} disabled={!ok} onClick={() => { setWarn(false); setPicked((p) => p.map((x, i) => (i === gi ? value : x))); }}
                  className={`min-w-12 border-2 px-3 py-2 font-bold transition-colors ${on ? "border-ink bg-ink text-paper" : "border-ink/25 hover:border-ink"} ${ok ? "" : "cursor-not-allowed line-through opacity-35"}`}>{value}</button>
              );
            })}
          </div>
        </fieldset>
      )) : null}
      {chosen?.pricePence !== undefined && chosen.pricePence !== product.pricePence ? <p className="mb-3 text-sm text-muted">Price for this option: <b className="text-ink">{formatPrice(chosen.pricePence)}</b></p> : null}
      {warn ? <p role="alert" className="mb-3 font-bold text-red-600">Please choose {og.labels.map((l) => l.toLowerCase()).join(" and ")} first.</p> : null}
      {chosen && !avail(chosen) ? <div className="mb-4"><p className="mb-3 font-bold text-red-600">That option is sold out.</p><StockAlertForm slug={product.slug} variant={chosen.name} label={`${product.name} (${chosen.name})`} /></div> : chosen && product.trackStock && chosen.stockQty <= product.lowStockThreshold ? <p className="mb-3 text-sm font-bold text-amber-500">Only {chosen.stockQty} left</p> : null}
      <div className="flex gap-3">
        <label className="sr-only" htmlFor={`${id}-q`}>Quantity</label>
        <select id={`${id}-q`} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-20 border border-ink/20 bg-paper px-3 font-bold">
          {Array.from({ length: Math.min(10, chosen && product.trackStock ? Math.max(1, chosen.stockQty) : 10) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" onClick={submit} disabled={sold} className="btn flex-1" aria-live="polite">{sold ? "Sold out" : added ? "Added to basket" : "Add to basket"}</button>
      </div>
    </div>
  );
}
