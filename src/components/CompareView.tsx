"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useShopUi } from "@/components/ShopUi";
import { productImagePath } from "@/lib/card";
import { formatPrice } from "@/lib/site";
import type { Product } from "@/lib/types";

export function CompareView({ products, franchiseNames, categoryNames }: { products: Product[]; franchiseNames: Record<string, string>; categoryNames: Record<string, string> }) {
  const { compare, removeCompare, clearCompare } = useShopUi();
  const { add } = useCart();
  const picked = compare.map((c) => products.find((p) => p.slug === c.slug)).filter((p): p is Product => Boolean(p));

  if (picked.length === 0) {
    return (
      <div className="mt-8">
        <p className="serif text-xl text-muted">Nothing to compare yet. Use the compare icon on any product card to add up to four.</p>
        <Link href="/shop" className="btn mt-6">Browse all merchandise</Link>
      </div>
    );
  }

  const th = "w-32 shrink-0 border-t border-ink/25 py-4 pr-4 text-left align-top text-sm font-bold text-muted sm:w-40";
  const td = "min-w-44 border-t border-ink/25 px-3 py-4 align-top";
  const rows: { label: string; cell: (p: Product) => React.ReactNode }[] = [
    { label: "Franchise", cell: (p) => franchiseNames[p.franchiseSlug] ?? "-" },
    { label: "Type", cell: (p) => categoryNames[p.categorySlug] ?? "-" },
    { label: "Price", cell: (p) => (
      <span className="flex items-baseline gap-2"><span className="text-lg font-bold">{formatPrice(p.pricePence)}</span>{p.comparePricePence && <s className="text-muted">{formatPrice(p.comparePricePence)}</s>}</span>
    ) },
    { label: "Availability", cell: (p) => (p.inStock ? "In stock" : "Sold out") },
    { label: "SKU", cell: (p) => p.sku },
    { label: "Summary", cell: (p) => p.shortDescription },
    { label: "Details", cell: (p) => (p.details.length ? <ul className="list-disc space-y-1 pl-4">{p.details.map((d) => <li key={d}>{d}</li>)}</ul> : "-") },
  ];

  return (
    <div className="mt-8">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Product comparison</caption>
          <thead>
            <tr>
              <td className="w-32 sm:w-40" />
              {picked.map((p) => (
                <th key={p.slug} scope="col" className="min-w-44 px-3 pb-4 text-left align-top font-normal">
                  <Link href={`/products/${p.slug}`} className="block border border-ink/20 bg-paper-2">
                    <Image src={productImagePath(p)} alt={p.name} width={400} height={400} unoptimized className="aspect-square w-full object-cover" />
                  </Link>
                  <Link href={`/products/${p.slug}`} className="mt-3 block font-bold hover:underline hover:underline-offset-4">{p.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className={th}>{r.label}</th>
                {picked.map((p) => <td key={p.slug} className={td}>{r.cell(p)}</td>)}
              </tr>
            ))}
            <tr>
              <th scope="row" className={th}><span className="sr-only">Actions</span></th>
              {picked.map((p) => (
                <td key={p.slug} className={td}>
                  <div className="flex flex-col items-start gap-3">
                    {p.inStock
                      ? <button className="btn btn-sm" onClick={() => add({ slug: p.slug, name: p.name, pricePence: p.pricePence, image: productImagePath(p) }, 1)}>Add to basket</button>
                      : <button className="btn btn-sm" disabled>Sold out</button>}
                    <button onClick={() => removeCompare(p.slug)} className="text-sm underline underline-offset-4 hover:text-muted">Remove</button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <button onClick={clearCompare} className="mt-8 text-sm font-bold underline underline-offset-4">Clear comparison</button>
    </div>
  );
}
