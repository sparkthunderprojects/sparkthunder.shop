"use client";

import { useT } from "@/components/LocaleProvider";
import Image from "next/image";
import Link from "@/components/LocaleLink";
import { useEffect, useState } from "react";
import { BuyBox } from "@/components/BuyBox";
import { SlideOver } from "@/components/SlideOver";
import { useShopUi } from "@/components/ShopUi";
import { isPlaceholderArt, type QuickProduct } from "@/lib/card";
import { useMoney } from "@/components/Currency";

/** Large frosted slide-out from the right: photos, price, option pickers and add to basket. */
export function QuickViewModal() {
  const money = useMoney();
  const { t } = useT();
  const { quick, closeQuick } = useShopUi();
  const [last, setLast] = useState<QuickProduct | null>(null);
  const [idx, setIdx] = useState(0);
  useEffect(() => { if (quick) { setLast(quick); setIdx(0); } }, [quick]);
  const p = quick ?? last; // keep content on screen while the panel slides away
  return (
    <SlideOver open={Boolean(quick)} onClose={closeQuick} title={t("Quick view")} wide>
      {p ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <Link href={`/products/${p.slug}`} onClick={closeQuick} className="block overflow-hidden border border-white/15 bg-black/20">
                <Image src={p.images[idx] ?? p.image} alt={t("{name} - official Sparkthunder merchandise", { name: p.name })} width={900} height={900} unoptimized={isPlaceholderArt(p.images[idx] ?? p.image)} className="aspect-square w-full object-cover" priority />
              </Link>
              {p.images.length > 1 ? (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {p.images.map((src, i) => (
                    <button key={src + i} type="button" aria-label={t("Show photo {n}", { n: i + 1 })} aria-pressed={i === idx} onClick={() => setIdx(i)} className={`overflow-hidden border-2 ${i === idx ? "border-bolt" : "border-white/15 hover:border-white/50"}`}>
                      <Image src={src} alt="" width={160} height={160} unoptimized={isPlaceholderArt(src)} className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col">
              {p.franchiseName ? <p className="font-bold text-muted">{p.franchiseName}</p> : null}
              <h3 className="display mt-1 text-4xl sm:text-5xl">{p.name}</h3>
              <p className="mt-4 flex items-baseline gap-3">
                <span className="display text-4xl">{money(p.pricePence)}</span>
                {p.comparePricePence ? <s className="text-muted">{money(p.comparePricePence)}</s> : null}
              </p>
              <p className="mt-4 text-lg leading-relaxed">{p.shortDescription}</p>
              <div className="mt-6"><BuyBox key={p.slug} product={p} onAdded={closeQuick} /></div>
              {p.details.length ? <ul className="mt-6 border-b border-white/15 text-sm">{p.details.map((d) => <li key={d} className="border-t border-white/15 py-2">{d}</li>)}</ul> : null}
              <Link href={`/products/${p.slug}`} onClick={closeQuick} className="link-line mt-6 w-fit font-bold">{t("View full details")}</Link>
            </div>
          </div>
        </div>
      ) : null}
    </SlideOver>
  );
}
