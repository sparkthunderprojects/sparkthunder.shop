"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

type Sort = "featured" | "newest" | "price-asc" | "price-desc" | "name";
type View = "large" | "default" | "dense";

const SORTS: { value: Sort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];
const BANDS: { value: string; label: string; test: (pence: number) => boolean }[] = [
  { value: "all", label: "Any price", test: () => true },
  { value: "u15", label: "Under £15", test: (p) => p < 1500 },
  { value: "15-25", label: "£15 to £25", test: (p) => p >= 1500 && p < 2500 },
  { value: "25-50", label: "£25 to £50", test: (p) => p >= 2500 && p < 5000 },
  { value: "50+", label: "£50 and over", test: (p) => p >= 5000 },
];
const VIEW_CLASS: Record<View, string> = {
  large: "grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4",
  default: "grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6",
  dense: "grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8",
};
const VIEW_KEY = "sparkthunder-grid-v1";

const select = "border-2 border-ink bg-paper px-3 py-2 text-sm font-bold";

function ViewIcon({ cols }: { cols: number }) {
  return (
    <svg viewBox="0 0 20 14" className="h-3.5 w-5" aria-hidden="true" fill="currentColor">
      {Array.from({ length: cols }, (_, i) => <rect key={i} x={(20 / cols) * i + 0.5} y="0" width={20 / cols - 1.5} height="14" />)}
    </svg>
  );
}

/**
 * Sorting, filtering and grid-size controls. The server renders every product in default order (so the page is
 * complete HTML for crawlers); these controls then reshape it instantly in the browser with no extra URLs to index.
 */
export function Listing({ products, franchiseNames, categoryNames = {}, priorityCount = 4 }: {
  products: Product[];
  franchiseNames: Record<string, string>;
  categoryNames?: Record<string, string>;
  priorityCount?: number;
}) {
  const [sort, setSort] = useState<Sort>("featured");
  const [franchise, setFranchise] = useState("all");
  const [category, setCategory] = useState("all");
  const [band, setBand] = useState("all");
  const [inStock, setInStock] = useState(false);
  const [view, setView] = useState<View>("default");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "large" || v === "default" || v === "dense") setView(v);
    } catch {}
  }, []);
  const pickView = (v: View) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch {} };

  const franchiseOptions = useMemo(() => [...new Set(products.map((p) => p.franchiseSlug))], [products]);
  const categoryOptions = useMemo(() => [...new Set(products.map((p) => p.categorySlug))], [products]);

  const shown = useMemo(() => {
    const test = BANDS.find((b) => b.value === band)?.test ?? (() => true);
    const list = products.filter((p) =>
      (franchise === "all" || p.franchiseSlug === franchise) &&
      (category === "all" || p.categorySlug === category) &&
      (!inStock || p.inStock) &&
      test(p.pricePence));
    const by: Record<Sort, (a: Product, b: Product) => number> = {
      featured: () => 0,
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      "price-asc": (a, b) => a.pricePence - b.pricePence,
      "price-desc": (a, b) => b.pricePence - a.pricePence,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [products, franchise, category, band, inStock, sort]);

  const active = franchise !== "all" || category !== "all" || band !== "all" || inStock;
  const reset = () => { setFranchise("all"); setCategory("all"); setBand("all"); setInStock(false); setSort("featured"); };

  return (
    <section aria-label="Products">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-y-2 border-ink py-3">
        <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="listing-filters" className={`${select} md:hidden`}>
          Filters{active ? " (on)" : ""}
        </button>
        <div id="listing-filters" className={`${filtersOpen ? "flex" : "hidden"} order-last basis-full flex-wrap items-center gap-x-4 gap-y-3 md:order-none md:flex md:basis-auto`}>
        {franchiseOptions.length > 1 && (
          <label className="flex items-center gap-2 text-sm"><span aria-hidden className="max-sm:hidden text-muted">Franchise</span>
            <select aria-label="Filter by franchise" value={franchise} onChange={(e) => setFranchise(e.target.value)} className={select}>
              <option value="all">All franchises</option>
              {franchiseOptions.map((s) => <option key={s} value={s}>{franchiseNames[s] ?? s}</option>)}
            </select>
          </label>
        )}
        {categoryOptions.length > 1 && (
          <label className="flex items-center gap-2 text-sm"><span aria-hidden className="max-sm:hidden text-muted">Type</span>
            <select aria-label="Filter by type" value={category} onChange={(e) => setCategory(e.target.value)} className={select}>
              <option value="all">All types</option>
              {categoryOptions.map((s) => <option key={s} value={s}>{categoryNames[s] ?? s}</option>)}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm"><span aria-hidden className="max-sm:hidden text-muted">Price</span>
          <select aria-label="Filter by price" value={band} onChange={(e) => setBand(e.target.value)} className={select}>
            {BANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-4 w-4 accent-[#11142a]" />
          In stock only
        </label>

        </div>

        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><span aria-hidden className="max-sm:hidden text-muted">Sort by</span>
            <select aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={select}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <div className="hidden sm:flex" role="group" aria-label="Grid size">
            {([["large", 2, "Larger"], ["default", 3, "Default"], ["dense", 4, "Smaller"]] as const).map(([v, cols, label]) => (
              <button key={v} type="button" onClick={() => pickView(v)} aria-pressed={view === v} aria-label={`${label} products`} title={label}
                className={`flex h-9 w-9 items-center justify-center border-2 border-ink ${v !== "large" ? "-ml-0.5" : ""} ${view === v ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-bolt"}`}>
                <ViewIcon cols={cols} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted" role="status" aria-live="polite">
        {shown.length === products.length ? `${products.length} product${products.length === 1 ? "" : "s"}` : `Showing ${shown.length} of ${products.length} products`}
        {active && <button onClick={reset} className="ml-3 font-bold text-ink underline underline-offset-4">Clear filters</button>}
      </p>

      {shown.length === 0 ? (
        <p className="serif mt-8 text-xl text-muted">Nothing matches those filters. <button onClick={reset} className="font-bold text-ink underline underline-offset-4">Clear them</button> to see everything.</p>
      ) : (
        <div className={`mt-6 grid ${VIEW_CLASS[view]}`}>
          {shown.map((p, i) => <ProductCard key={p.slug} product={p} franchiseName={franchiseNames[p.franchiseSlug]} priority={i < priorityCount} />)}
        </div>
      )}
    </section>
  );
}
