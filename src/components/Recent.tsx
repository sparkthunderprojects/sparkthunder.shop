"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

const KEY = "sparkthunder-recent-v1";
const MAX = 12;

function read(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter((s) => typeof s === "string") : []; } catch { return []; }
}

/** Remembers a product page visit (renders nothing). */
export function RecentTracker({ slug }: { slug: string }) {
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify([slug, ...read().filter((s) => s !== slug)].slice(0, MAX))); } catch {}
  }, [slug]);
  return null;
}

/** Shows the products this visitor looked at most recently. Renders nothing until there are some. */
export function RecentlyViewed({ products, franchiseNames, excludeSlug, limit = 5 }: { products: Product[]; franchiseNames: Record<string, string>; excludeSlug?: string; limit?: number }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => setSlugs(read()), []);
  const list = slugs
    .filter((s) => s !== excludeSlug)
    .map((s) => products.find((p) => p.slug === s))
    .filter((p): p is Product => Boolean(p))
    .slice(0, limit);
  if (list.length === 0) return null;
  return (
    <section className="mt-24" aria-labelledby="recent-h">
      <h2 id="recent-h" className="display text-5xl">Recently viewed</h2>
      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-5">
        {list.map((p) => <ProductCard key={p.slug} product={p} franchiseName={franchiseNames[p.franchiseSlug]} />)}
      </div>
    </section>
  );
}
