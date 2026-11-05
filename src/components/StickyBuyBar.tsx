"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/site";

/** Slides in under the header once the main add-to-basket button has scrolled out of view. */
export function StickyBuyBar({ targetId, item, inStock }: { targetId: string; item: { slug: string; name: string; pricePence: number; image: string }; inStock: boolean }) {
  const { add } = useCart();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 top-[4.25rem] z-30 border-b border-ink/15 bg-paper" role="region" aria-label="Quick purchase">
      <div className="flex items-center gap-4 px-(--gutter) py-2.5">
        <Image src={item.image} alt="" width={48} height={48} unoptimized className="hidden h-12 w-12 border border-ink/20 object-cover sm:block" />
        <p className="min-w-0 flex-1 truncate font-bold">{item.name}</p>
        <p className="display text-2xl">{formatPrice(item.pricePence)}</p>
        {inStock
          ? <button onClick={() => add(item, 1)} className="btn btn-sm">Add to basket</button>
          : <button disabled className="btn btn-sm">Sold out</button>}
      </div>
    </div>
  );
}
