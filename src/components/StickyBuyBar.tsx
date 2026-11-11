"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useMoney } from "@/components/Currency";
import { isUpcoming } from "@/lib/launch";

/** Slides in under the header once the main add-to-basket button has scrolled out of view. */
export function StickyBuyBar({ targetId, item, inStock, hasOptions = false, launchAt }: { targetId: string; item: { slug: string; name: string; pricePence: number; image: string }; inStock: boolean; hasOptions?: boolean; launchAt?: string }) {
  const money = useMoney();
  const { add } = useCart();
  const [show, setShow] = useState(false);
  const [added, setAdded] = useState(false);
  const soon = isUpcoming(launchAt);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-[3.9rem] z-30 border-y border-ink/15 bg-paper shadow-[0_-6px_20px_rgba(0,0,0,.25)] md:bottom-auto md:top-[5rem] md:border-y-0 md:border-b md:shadow-none lg:top-[8rem]" role="region" aria-label="Quick purchase">
      <div className="flex items-center gap-4 px-(--gutter) py-2.5">
        <Image src={item.image} alt="" width={48} height={48} unoptimized className="hidden h-12 w-12 border border-ink/20 object-cover sm:block" />
        <p className="min-w-0 flex-1 truncate font-bold">{item.name}</p>
        <p className="display text-2xl">{money(item.pricePence)}</p>
        {soon ? <button disabled className="btn btn-sm">Coming soon</button>
          : inStock
            ? <button onClick={() => { if (hasOptions) document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" }); else { add(item, 1); setAdded(true); setTimeout(() => setAdded(false), 1800); } }} className="btn btn-sm">{hasOptions ? "Choose options" : added ? "Added ✓" : "Add to basket"}</button>
            : <button disabled className="btn btn-sm">Sold out</button>}
      </div>
    </div>
  );
}
