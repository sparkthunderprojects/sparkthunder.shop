"use client";

import { useT } from "@/components/LocaleProvider";
import Link from "@/components/LocaleLink";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist } from "@/components/WishlistProvider";
import { GRID } from "@/lib/ui";
import type { Product } from "@/lib/types";

const MAX_SHARED = 60;

export function WishlistView({ products, franchiseNames }: { products: Product[]; franchiseNames: Record<string, string> }) {
  const { t } = useT();
  const { slugs, has, toggle } = useWishlist();
  const params = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  // A shared link looks like /wishlist?items=slug-a,slug-b. Only slugs that exist in the catalogue are shown.
  const sharedParam = params.get("items");
  const sharedSlugs = sharedParam ? [...new Set(sharedParam.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, MAX_SHARED) : null;
  const sharedProducts = sharedSlugs ? sharedSlugs.map((s) => products.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p)) : [];

  async function share() {
    const url = `${location.origin}/wishlist?items=${slugs.join(",")}`;
    try {
      if (navigator.share) { await navigator.share({ title: t("My Sparkthunder favourites"), url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  }

  if (sharedSlugs) {
    const toAdd = sharedProducts.filter((p) => !has(p.slug));
    return (
      <div className="mt-8">
        <p className="serif text-xl text-muted">{t("Someone shared their favourites with you.")}</p>
        {sharedProducts.length === 0 ? (
          <p className="mt-6">{t("None of those products are available any more.")} <Link href="/new" className="font-bold underline underline-offset-4">{t("See new arrivals")}</Link></p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button type="button" disabled={toAdd.length === 0 || added} onClick={() => { toAdd.forEach((p) => toggle(p.slug)); setAdded(true); }} className="btn btn-sm" aria-live="polite">
                {added ? t("Added to your favourites") : toAdd.length === 0 ? t("Already in your favourites") : t("Add all {n} to my favourites", { n: toAdd.length })}
              </button>
              <Link href="/wishlist" className="font-bold underline underline-offset-4">{t("View my own favourites")}</Link>
            </div>
            <div className={`mt-10 ${GRID}`}>
              {sharedProducts.map((p) => <ProductCard key={p.slug} product={p} franchiseName={franchiseNames[p.franchiseSlug]} />)}
            </div>
          </>
        )}
      </div>
    );
  }

  const saved = products.filter((p) => slugs.includes(p.slug));
  if (saved.length === 0) {
    return (
      <div className="mt-8">
        <p className="serif text-xl text-muted">{t("Nothing saved yet. Tap the heart on any product to keep it here.")}</p>
        <Link href="/new" className="btn mt-6">{t("Shop new arrivals")}</Link>
      </div>
    );
  }
  return (
    <div>
      <p className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={share} className="btn btn-sm" aria-live="polite">{copied ? t("Link copied") : t("Share my favourites")}</button>
        <span className="text-sm text-muted">{t("Send the link to a friend (or hint at your birthday).")}</span>
      </p>
      <div className={`mt-8 ${GRID}`}>
        {saved.map((p) => <ProductCard key={p.slug} product={p} franchiseName={franchiseNames[p.franchiseSlug]} />)}
      </div>
    </div>
  );
}
