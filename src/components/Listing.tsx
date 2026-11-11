"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useMoney } from "@/components/Currency";
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
const STEP = 100; // the slider moves in whole pounds
const BINS = 14;
const VIEW_CLASS: Record<View, string> = {
  large: "grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4",
  default: "grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6",
  dense: "grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8",
};
const FLUSH_CLASS: Record<View, string> = {
  large: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4",
  default: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  dense: "grid-cols-2 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8",
};
const VIEW_KEY = "sparkthunder-grid-v1";

const select = "border border-ink/20 bg-paper px-3 py-2 text-sm font-bold";
const facetBtn = "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left font-bold";

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
export function Listing({ products, franchiseNames, categoryNames = {}, priorityCount = 4, flush = false }: {
  products: Product[];
  franchiseNames: Record<string, string>;
  categoryNames?: Record<string, string>;
  priorityCount?: number;
  /** Edge-to-edge catalogue grid with hairline dividers (used for search results). */
  flush?: boolean;
}) {
  const money = useMoney();
  const [sort, setSort] = useState<Sort>("featured");
  const [franchise, setFranchise] = useState("all");
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState<[number, number] | null>(null); // null = the full price range
  const [inStock, setInStock] = useState(false);
  const [view, setView] = useState<View>("default");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "large" || v === "default" || v === "dense") setView(v);
    } catch {}
  }, []);
  const pickView = (v: View) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch {} };

  const franchiseOptions = useMemo(() => [...new Set(products.map((p) => p.franchiseSlug))], [products]);
  const categoryOptions = useMemo(() => [...new Set(products.map((p) => p.categorySlug))], [products]);

  // Slider bounds come from the real catalogue, rounded out to whole pounds.
  const bounds = useMemo<[number, number]>(() => {
    if (products.length === 0) return [0, 0];
    const prices = products.map((p) => p.pricePence);
    return [Math.floor(Math.min(...prices) / STEP) * STEP, Math.ceil(Math.max(...prices) / STEP) * STEP];
  }, [products]);
  const canSlide = bounds[1] > bounds[0];
  const [lo, hi] = range ?? bounds;
  const priceActive = canSlide && (lo > bounds[0] || hi < bounds[1]);
  // A small chart of how many products sit at each price, so shoppers can see where the range is worth narrowing.
  const histogram = useMemo(() => {
    const bins = Array<number>(BINS).fill(0);
    const span = bounds[1] - bounds[0] || 1;
    for (const p of products) bins[Math.min(BINS - 1, Math.floor(((p.pricePence - bounds[0]) / span) * BINS))]++;
    return bins;
  }, [products, bounds]);
  const setLo = (v: number) => change(() => setRange([Math.min(v, hi), hi]));
  const setHi = (v: number) => change(() => setRange([lo, Math.max(v, lo)]));

  const shown = useMemo(() => {
    const test = (pence: number) => !priceActive || (pence >= lo && pence <= hi);
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
  }, [products, franchise, category, priceActive, lo, hi, inStock, sort]);

  const active = franchise !== "all" || category !== "all" || priceActive || inStock;
  const activeCount = Number(franchise !== "all") + Number(category !== "all") + Number(priceActive) + Number(inStock);
  const reset = () => { change(() => { setFranchise("all"); setCategory("all"); setRange(null); setInStock(false); setSort("featured"); }); };

  // Filters apply instantly (no reload); a brief fade signals the results refreshing, like an AJAX update.
  function change(fn: () => void) {
    setBusy(true);
    fn();
    setTimeout(() => setBusy(false), 160);
  }

  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFiltersOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [filtersOpen]);

  const countFor = (f: (p: Product) => boolean) => products.filter(f).length;
  const facet = (name: string, value: string, current: string, set: (v: string) => void, label: string, n?: number) => (
    <li key={value}>
      <label className={`${facetBtn} cursor-pointer ${current === value ? "bg-ink text-paper" : "hover:bg-paper-2"}`}>
        <span className="flex items-center gap-3">
          <input type="radio" name={name} checked={current === value} onChange={() => change(() => set(value))} className="sr-only" />
          <span aria-hidden className={`h-3.5 w-3.5 border ${current === value ? "border-bolt bg-bolt" : "border-current"}`} />
          {label}
        </span>
        {n !== undefined && <span className={`text-sm font-normal ${current === value ? "text-paper/80" : "text-muted"}`}>{n}</span>}
      </label>
    </li>
  );

  const chips: { label: string; clear: () => void }[] = [
    ...(franchise !== "all" ? [{ label: franchiseNames[franchise] ?? franchise, clear: () => setFranchise("all") }] : []),
    ...(category !== "all" ? [{ label: categoryNames[category] ?? category, clear: () => setCategory("all") }] : []),
    ...(priceActive ? [{ label: `${money(lo)} to ${money(hi)}`, clear: () => setRange(null) }] : []),
    ...(inStock ? [{ label: "In stock only", clear: () => setInStock(false) }] : []),
  ];

  return (
    <section aria-label="Products">
      <div className="sticky top-[5.05rem] lg:top-[8.05rem] z-20 -mx-(--gutter) flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-ink/15 bg-paper px-(--gutter) py-3">
        <button type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" className="btn btn-ink btn-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4" /></svg>
          Filters{activeCount > 0 && <span className="bg-bolt px-1.5 py-0.5 text-xs font-extrabold text-(--color-on-accent)">{activeCount}</span>}
        </button>
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {shown.length === products.length ? `${products.length} product${products.length === 1 ? "" : "s"}` : `Showing ${shown.length} of ${products.length}`}
        </p>

        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><span aria-hidden className="max-sm:hidden text-muted">Sort by</span>
            <select aria-label="Sort products" value={sort} onChange={(e) => change(() => setSort(e.target.value as Sort))} className={select}>
              {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <div className="hidden sm:flex" role="group" aria-label="Grid size">
            {([["large", 2, "Larger"], ["default", 3, "Default"], ["dense", 4, "Smaller"]] as const).map(([v, cols, label]) => (
              <button key={v} type="button" onClick={() => pickView(v)} aria-pressed={view === v} aria-label={`${label} products`} title={label}
                className={`flex h-9 w-9 items-center justify-center border border-ink/20 ${v !== "large" ? "-ml-0.5" : ""} ${view === v ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-bolt"}`}>
                <ViewIcon cols={cols} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.label}>
              <button onClick={() => change(c.clear)} aria-label={`Remove filter ${c.label}`} className="flex items-center gap-2 border border-ink/20 bg-paper px-3 py-1 text-sm font-bold hover:bg-bolt">
                {c.label}<span aria-hidden>×</span>
              </button>
            </li>
          ))}
          <li><button onClick={reset} className="ml-1 text-sm font-bold underline underline-offset-4">Clear all</button></li>
        </ul>
      )}

      {shown.length === 0 ? (
        <p className="serif mt-8 text-xl text-muted">Nothing matches those filters. <button onClick={reset} className="font-bold text-ink underline underline-offset-4">Clear them</button> to see everything.</p>
      ) : (
        <div className={`mt-6 grid transition-opacity duration-150 ${busy ? "opacity-40" : "opacity-100"} ${flush ? `-mx-(--gutter) border-l border-t border-ink/15 ${FLUSH_CLASS[view]}` : VIEW_CLASS[view]}`}>
          {shown.map((p, i) => <ProductCard key={p.slug} product={p} variant={flush ? "flush" : "default"} franchiseName={franchiseNames[p.franchiseSlug]} priority={i < priorityCount} />)}
        </div>
      )}

      {filtersOpen && (
        <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label="Filter products">
          <button aria-label="Close filters" tabIndex={-1} onClick={() => setFiltersOpen(false)} className="absolute inset-0 bg-ink/60" />
          <aside className="filter-panel absolute left-0 top-0 flex h-full w-[min(24rem,100vw)] flex-col border-r border-ink/15 bg-paper">
            <div className="flex items-center justify-between border-b border-ink/15 px-5 py-4">
              <h2 className="display text-3xl">Filters</h2>
              <button ref={closeRef} onClick={() => setFiltersOpen(false)} className="px-2 py-1 font-bold underline underline-offset-4">Close</button>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
              {franchiseOptions.length > 1 && (
                <fieldset>
                  <legend className="display mb-2 text-2xl">Franchise</legend>
                  <ul>
                    {facet("franchise", "all", franchise, setFranchise, "All franchises", products.length)}
                    {franchiseOptions.map((v) => facet("franchise", v, franchise, setFranchise, franchiseNames[v] ?? v, countFor((p) => p.franchiseSlug === v)))}
                  </ul>
                </fieldset>
              )}
              {categoryOptions.length > 1 && (
                <fieldset>
                  <legend className="display mb-2 text-2xl">Type</legend>
                  <ul>
                    {facet("category", "all", category, setCategory, "All types", products.length)}
                    {categoryOptions.map((v) => facet("category", v, category, setCategory, categoryNames[v] ?? v, countFor((p) => p.categorySlug === v)))}
                  </ul>
                </fieldset>
              )}
              {canSlide && (
                <fieldset>
                  <legend className="display mb-2 text-2xl">Price</legend>
                  <div className="px-1">
                    <div className="flex h-10 items-end gap-0.5" aria-hidden="true">
                      {histogram.map((n, i) => {
                        const binLo = bounds[0] + ((bounds[1] - bounds[0]) / BINS) * i;
                        const inside = binLo + (bounds[1] - bounds[0]) / BINS > lo && binLo < hi;
                        return <span key={i} className={`flex-1 ${inside ? "bg-ink/70" : "bg-ink/15"}`} style={{ height: `${Math.max(6, (n / Math.max(...histogram)) * 100)}%` }} />;
                      })}
                    </div>
                    <div className="price-range">
                      <span className="track" />
                      <span className="fill" style={{ left: `${((lo - bounds[0]) / (bounds[1] - bounds[0])) * 100}%`, right: `${100 - ((hi - bounds[0]) / (bounds[1] - bounds[0])) * 100}%` }} />
                      <input type="range" aria-label="Minimum price" min={bounds[0]} max={bounds[1]} step={STEP} value={lo} onChange={(e) => setLo(Number(e.target.value))} aria-valuetext={money(lo)} style={{ zIndex: lo > bounds[0] + (bounds[1] - bounds[0]) / 2 ? 2 : 1 }} />
                      <input type="range" aria-label="Maximum price" min={bounds[0]} max={bounds[1]} step={STEP} value={hi} onChange={(e) => setHi(Number(e.target.value))} aria-valuetext={money(hi)} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-bold" aria-live="polite">
                      <span className="border border-ink/20 px-2.5 py-1">{money(lo)}</span>
                      <span aria-hidden className="text-muted">to</span>
                      <span className="border border-ink/20 px-2.5 py-1">{money(hi)}</span>
                    </div>
                  </div>
                </fieldset>
              )}
              <fieldset>
                <legend className="display mb-2 text-2xl">Availability</legend>
                <label className={`${facetBtn} cursor-pointer ${inStock ? "bg-ink text-paper" : "hover:bg-paper-2"}`}>
                  <span className="flex items-center gap-3">
                    <input type="checkbox" checked={inStock} onChange={(e) => change(() => setInStock(e.target.checked))} className="sr-only" />
                    <span aria-hidden className={`h-3.5 w-3.5 border ${inStock ? "border-bolt bg-bolt" : "border-current"}`} />
                    In stock only
                  </span>
                  <span className={`text-sm font-normal ${inStock ? "text-paper/80" : "text-muted"}`}>{countFor((p) => p.inStock)}</span>
                </label>
              </fieldset>
            </div>

            <div className="grid grid-cols-[auto_1fr] items-center gap-4 border-t border-ink/15 p-5">
              <button onClick={reset} disabled={!active} className="font-bold underline underline-offset-4 disabled:text-muted disabled:no-underline">Clear all</button>
              <button onClick={() => setFiltersOpen(false)} className="btn" aria-live="polite">Show {shown.length} product{shown.length === 1 ? "" : "s"}</button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
