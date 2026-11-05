import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { QuickProduct } from "@/lib/card";
import { formatPrice } from "@/lib/site";

/** One product line inside a slide-over panel: image, name, price and actions. */
export function PanelProductRow({ product: p, onNavigate, children }: { product: QuickProduct; onNavigate: () => void; children?: ReactNode }) {
  return (
    <li className="flex gap-4 py-4">
      <Link href={`/products/${p.slug}`} onClick={onNavigate} className="shrink-0">
        <Image src={p.image} alt="" width={88} height={110} unoptimized className="h-[5.5rem] w-[4.4rem] border border-white/20 bg-paper-2 object-cover" />
      </Link>
      <div className="min-w-0 flex-1">
        {p.franchiseName && <p className="text-xs font-bold uppercase tracking-wide text-muted">{p.franchiseName}</p>}
        <Link href={`/products/${p.slug}`} onClick={onNavigate} className="block font-bold leading-snug hover:underline hover:underline-offset-4">{p.name}</Link>
        <p className="mt-0.5 text-sm">
          <span className="font-bold">{formatPrice(p.pricePence)}</span>
          {p.comparePricePence && p.comparePricePence > p.pricePence && <span className="ml-2 text-muted line-through">{formatPrice(p.comparePricePence)}</span>}
        </p>
        {children && <div className="mt-2 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </li>
  );
}
