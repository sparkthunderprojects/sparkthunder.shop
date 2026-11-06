"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/site";

export type FbtItem = { slug: string; name: string; pricePence: number; image: string };

/** "Customers often buy these together", built from real orders. Adds every item in one tap. */
export function FrequentlyBought({ main, partners }: { main: FbtItem; partners: FbtItem[] }) {
  const { add } = useCart();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(partners.map((p) => p.slug)));
  const [done, setDone] = useState(false);
  const chosen = [main, ...partners.filter((p) => picked.has(p.slug))];
  const total = chosen.reduce((n, p) => n + p.pricePence, 0);
  const toggle = (s: string) => setPicked((c) => { const n = new Set(c); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  return (
    <section className="mt-24" aria-labelledby="fbt-h">
      <h2 id="fbt-h" className="display text-2xl sm:text-3xl">Often bought together</h2>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {[main, ...partners].map((p, i) => (
          <div key={p.slug} className="flex items-center gap-4">
            {i > 0 ? <span aria-hidden className="display text-2xl">+</span> : null}
            <div className={`w-36 ${i > 0 && !picked.has(p.slug) ? "opacity-40" : ""}`}>
              <Image src={p.image} alt="" width={144} height={144} unoptimized className="h-36 w-36 border border-ink/15 object-cover" />
              <label className="mt-2 flex items-start gap-2 text-sm">
                {i > 0 ? <input type="checkbox" checked={picked.has(p.slug)} onChange={() => toggle(p.slug)} className="mt-1" /> : <input type="checkbox" checked disabled className="mt-1" />}
                <span><Link href={`/products/${p.slug}`} className="underline underline-offset-4">{i === 0 ? "This item" : p.name}</Link><br /><b>{formatPrice(p.pricePence)}</b></span>
              </label>
            </div>
          </div>
        ))}
        <div className="ml-auto min-w-48">
          <p className="text-sm text-muted">Total for {chosen.length} {chosen.length === 1 ? "item" : "items"}</p>
          <p className="display text-3xl">{formatPrice(total)}</p>
          <button className="btn mt-3" onClick={() => { chosen.forEach((p) => add({ slug: p.slug, name: p.name, pricePence: p.pricePence, image: p.image, href: `/products/${p.slug}` }, 1)); setDone(true); setTimeout(() => setDone(false), 2000); }}>{done ? "Added ✓" : `Add ${chosen.length === 1 ? "item" : "all " + chosen.length} to basket`}</button>
        </div>
      </div>
    </section>
  );
}
