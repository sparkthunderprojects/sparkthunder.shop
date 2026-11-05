"use client";

import { useEffect, useRef, useState } from "react";
import type { QuickProduct } from "@/lib/card";

/** Fetches card data for the given slugs while `enabled`, keeping what it already has. Returns products in slug order. */
export function useProductLookup(slugs: string[], enabled: boolean) {
  const [known, setKnown] = useState<Record<string, QuickProduct>>({});
  const [loading, setLoading] = useState(false);
  const knownRef = useRef(known);
  knownRef.current = known;
  const key = slugs.join(",");

  useEffect(() => {
    if (!enabled) return;
    const missing = slugs.filter((s) => !knownRef.current[s]);
    if (missing.length === 0) return;
    const ctl = new AbortController();
    setLoading(true);
    fetch(`/api/lookup?slugs=${encodeURIComponent(missing.join(","))}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d: { products: QuickProduct[] }) => setKnown((cur) => ({ ...cur, ...Object.fromEntries(d.products.map((p) => [p.slug, p])) })))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { products: slugs.map((s) => known[s]).filter(Boolean), loading };
}
