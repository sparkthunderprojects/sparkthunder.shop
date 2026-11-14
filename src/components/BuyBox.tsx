"use client";

import { useT } from "@/components/LocaleProvider";
import { useEffect, useId, useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { QuickProduct } from "@/lib/card";
import { findVariant, optionGroups, partsOf } from "@/lib/variants";
import { useMoney } from "@/components/Currency";
import { SizeGuide } from "@/components/SizeGuide";
import { StockAlertForm } from "@/components/StockAlertForm";
import { Countdown, useNow } from "@/components/Countdown";
import { isUpcoming } from "@/lib/launch";

/** Option pickers (size, colour...), quantity and add-to-basket for one product. Used by quick view and the product page. */
export function BuyBox({ product, onAdded }: { product: QuickProduct; onAdded?: () => void }) {
  const money = useMoney();
  const { t } = useT();
  const { add } = useCart();
  const id = useId();
  const vs = product.variants;
  const og = useMemo(() => optionGroups(vs, product.optionNames), [vs, product.optionNames]);
  const [picked, setPicked] = useState<(string | null)[]>(() => og.groups.map((g) => (vs.length === 1 ? g[0] : null)));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [warn, setWarn] = useState(false);

  const chosen = vs.length ? findVariant(vs, og, picked) : null;
  const avail = (v: { stockQty: number }) => !product.trackStock || v.stockQty > 0;
  const price = chosen?.pricePence ?? product.pricePence;
  const compare = chosen ? chosen.comparePricePence : product.comparePricePence;
  // Show the photo of the option being looked at (the gallery listens for this).
  const lookedAt = chosen?.image;
  useEffect(() => { if (lookedAt) window.dispatchEvent(new CustomEvent("spark:variant-image", { detail: lookedAt })); }, [lookedAt]);
  const sold = !product.inStock || (chosen ? !avail(chosen) : false);

  // Is this option (given what is already picked in the other group) purchasable?
  const optionAvailable = (gi: number, value: string) => {
    const trial = picked.map((p, i) => (i === gi ? value : p));
    return vs.some((v) => avail(v) && partsOf(og, v.name).every((x, i) => !trial[i] || trial[i] === x));
  };

  function submit() {
    if (vs.length && !chosen) { setWarn(true); return; }
    add({
      slug: chosen ? `${product.slug}::${chosen.name}` : product.slug,
      name: chosen ? `${product.name} - ${chosen.name}` : product.name,
      pricePence: price, image: chosen?.image || product.image, href: `/products/${product.slug}`, ...(chosen ? { variant: chosen.name } : {}),
    }, qty);
    setAdded(true); setTimeout(() => setAdded(false), 1800); onAdded?.();
  }

  const now = useNow(Boolean(product.launchAt));
  if (isUpcoming(product.launchAt, now)) return (
    <div className="space-y-3">
      <Countdown to={product.launchAt!} />
      <button disabled className="btn w-full">{t("Coming soon")}</button>
    </div>
  );
  if (!product.inStock) return (
    <div className="space-y-3">
      <button disabled className="btn w-full">{t("Sold out")}</button>
      <StockAlertForm slug={product.slug} variant="" label={product.name} />
    </div>
  );
  return (
    <div>
      {vs.length > 0 ? og.groups.map((g, gi) => (
        <fieldset key={og.labels[gi]} className="mb-5">
          <legend className="mb-2 flex w-full items-center gap-2 font-bold">{t(og.labels[gi])}{picked[gi] ? <span className="font-normal text-muted">{picked[gi]}</span> : null}{og.labels[gi] === "Size" && product.categorySlug === "apparel" ? <span className="ml-auto font-normal"><SizeGuide /></span> : null}</legend>
          <div className="flex flex-wrap gap-2">
            {g.map((value) => {
              const ok = optionAvailable(gi, value), on = picked[gi] === value, swatch = product.swatches?.[value];
              if (swatch) return (
                <button key={value} type="button" aria-pressed={on} aria-label={ok ? value : t("{value} (sold out)", { value })} title={value} disabled={!ok} onClick={() => { setWarn(false); setPicked((p) => p.map((x, i) => (i === gi ? value : x))); }}
                  className={`relative h-10 w-10 rounded-full border-2 transition-shadow ${on ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper" : "border-ink/25 hover:border-ink"} ${ok ? "" : "cursor-not-allowed opacity-35"}`} style={{ background: swatch }}>
                  {ok ? null : <span aria-hidden className="absolute inset-0 flex items-center justify-center text-lg font-bold text-ink mix-blend-difference">/</span>}
                </button>
              );
              return (
                <button key={value} type="button" aria-pressed={on} disabled={!ok} onClick={() => { setWarn(false); setPicked((p) => p.map((x, i) => (i === gi ? value : x))); }}
                  className={`min-w-12 border-2 px-3 py-2 font-bold transition-colors ${on ? "border-ink bg-ink text-paper" : "border-ink/25 hover:border-ink"} ${ok ? "" : "cursor-not-allowed line-through opacity-35"}`}>{value}</button>
              );
            })}
          </div>
        </fieldset>
      )) : null}
      {chosen && (chosen.pricePence !== undefined && chosen.pricePence !== product.pricePence || (compare && compare > price)) ? <p className="mb-3 text-sm text-muted">{t("Price for this option:")} <b className="text-ink">{money(price)}</b>{compare && compare > price ? <s className="ml-2">{money(compare)}</s> : null}</p> : null}
      {warn ? <p role="alert" className="mb-3 font-bold text-red-600">{t("Please choose {options} first.", { options: og.labels.map((l) => t(l).toLowerCase()).join(t(" and ")) })}</p> : null}
      {chosen && !avail(chosen) ? <div className="mb-4"><p className="mb-3 font-bold text-red-600">{t("That option is sold out.")}</p><StockAlertForm slug={product.slug} variant={chosen.name} label={`${product.name} (${chosen.name})`} /></div> : chosen && product.trackStock && chosen.stockQty <= product.lowStockThreshold ? <p className="mb-3 text-sm font-bold text-amber-500">{t("Only {n} left", { n: chosen.stockQty })}</p> : null}
      <div className="flex gap-3">
        <label className="sr-only" htmlFor={`${id}-q`}>{t("Quantity")}</label>
        <select id={`${id}-q`} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-20 border border-ink/20 bg-paper px-3 font-bold">
          {Array.from({ length: Math.min(10, chosen && product.trackStock ? Math.max(1, chosen.stockQty) : 10) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" onClick={submit} disabled={sold} className="btn flex-1" aria-live="polite">{sold ? t("Sold out") : added ? t("Added to basket") : t("Add to basket")}</button>
      </div>
    </div>
  );
}
