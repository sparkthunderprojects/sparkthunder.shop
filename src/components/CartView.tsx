"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/site";

export function CartView() {
  const { items, subtotalPence, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <div className="mt-8">
        <p className="text-muted">Your basket is empty.</p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-accent px-6 py-3 font-semibold text-black">Continue shopping</Link>
      </div>
    );
  }
  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-panel">
        {items.map((i) => (
          <li key={i.slug} className="flex gap-4 p-4">
            <Image src={i.image} alt={i.name} width={96} height={96} unoptimized className="h-24 w-24 rounded-lg object-cover" />
            <div className="flex-1">
              <Link href={`/products/${i.slug}`} className="font-semibold hover:text-accent">{i.name}</Link>
              <p className="text-sm text-muted">{formatPrice(i.pricePence)} each</p>
              <div className="mt-2 flex items-center gap-3">
                <label className="sr-only" htmlFor={`q-${i.slug}`}>Quantity for {i.name}</label>
                <input id={`q-${i.slug}`} type="number" min={1} max={20} value={i.qty} onChange={(e) => setQty(i.slug, Number(e.target.value) || 1)} className="w-20 rounded-lg border border-white/15 bg-transparent px-3 py-1.5" />
                <button onClick={() => remove(i.slug)} className="text-sm text-muted underline hover:text-accent">Remove</button>
              </div>
            </div>
            <p className="font-bold">{formatPrice(i.pricePence * i.qty)}</p>
          </li>
        ))}
      </ul>
      <aside className="h-fit rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-lg font-bold">Order summary</h2>
        <p className="mt-4 flex justify-between"><span className="text-muted">Subtotal</span><span className="font-bold">{formatPrice(subtotalPence)}</span></p>
        <p className="mt-1 text-xs text-muted">Shipping and taxes are calculated at checkout.</p>
        <button disabled className="mt-6 w-full cursor-not-allowed rounded-full bg-accent/40 px-6 py-3.5 font-semibold text-black/70" title="Payments are not connected yet">Checkout (payments not connected yet)</button>
      </aside>
    </div>
  );
}
