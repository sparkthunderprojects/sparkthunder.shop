"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist } from "@/components/WishlistProvider";
import { GRID } from "@/lib/ui";
import type { Product } from "@/lib/types";

export function WishlistView({ products, franchiseNames }: { products: Product[]; franchiseNames: Record<string, string> }) {
  const { slugs } = useWishlist();
  const saved = products.filter((p) => slugs.includes(p.slug));
  if (saved.length === 0) {
    return (
      <div className="mt-8">
        <p className="serif text-xl text-muted">Nothing saved yet. Tap the heart on any product to keep it here.</p>
        <Link href="/new" className="btn mt-6">Shop new arrivals</Link>
      </div>
    );
  }
  return (
    <div className={`mt-10 ${GRID}`}>
      {saved.map((p) => <ProductCard key={p.slug} product={p} franchiseName={franchiseNames[p.franchiseSlug]} />)}
    </div>
  );
}
