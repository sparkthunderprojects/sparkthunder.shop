"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { AddToCart } from "@/components/AddToCart";
import { useShopUi } from "@/components/ShopUi";
import { isPlaceholderArt } from "@/lib/card";
import { formatPrice } from "@/lib/site";

export function QuickViewModal() {
  const { quick, closeQuick } = useShopUi();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!quick) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeQuick();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [quick, closeQuick]);

  if (!quick) return null;
  const href = `/products/${quick.slug}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Quick view: ${quick.name}`}>
      <button aria-label="Close quick view" tabIndex={-1} onClick={closeQuick} className="absolute inset-0 bg-ink/70" />
      <div className="relative grid max-h-full w-full max-w-4xl overflow-y-auto border border-ink/20 bg-paper sm:grid-cols-2">
        <Link href={href} onClick={closeQuick} className="block border-b border-ink/15 bg-paper-2 sm:border-b-0 sm:border-r">
          <Image src={quick.image} alt={`${quick.name} - official Sparkthunder merchandise`} width={800} height={800} unoptimized={isPlaceholderArt(quick.image)} className="aspect-square w-full object-cover" />
        </Link>
        <div className="flex flex-col p-6 sm:p-8">
          <button ref={closeRef} onClick={closeQuick} className="absolute right-3 top-3 border border-ink/20 bg-paper px-3 py-1 text-sm font-bold hover:bg-bolt">Close</button>
          {quick.franchiseName && <p className="font-bold text-muted">{quick.franchiseName}</p>}
          <h2 className="display mt-2 pr-16 text-4xl sm:text-5xl">{quick.name}</h2>
          <p className="mt-4 flex items-baseline gap-3">
            <span className="display text-4xl">{formatPrice(quick.pricePence)}</span>
            {quick.comparePricePence && <s className="text-muted">{formatPrice(quick.comparePricePence)}</s>}
          </p>
          <p className="serif mt-4 text-lg leading-relaxed">{quick.shortDescription}</p>
          <div className="mt-6">
            <AddToCart inStock={quick.inStock} onAdded={closeQuick} item={{ slug: quick.slug, name: quick.name, pricePence: quick.pricePence, image: quick.image }} />
          </div>
          <Link href={href} onClick={closeQuick} className="link-line mt-6 w-fit font-bold">View full details</Link>
        </div>
      </div>
    </div>
  );
}
