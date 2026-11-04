"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { FreeShippingBar } from "@/components/FreeShippingBar";
import { formatPrice } from "@/lib/site";

export function CartView() {
  const { items, subtotalPence, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <div className="mt-8">
        <p className="serif text-xl text-muted">Your basket is empty.</p>
        <Link href="/new" className="btn mt-6">Shop new arrivals</Link>
      </div>
    );
  }
  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem]">
      <ul className="divide-y-2 divide-ink border-y-2 border-ink">
        {items.map((i) => (
          <li key={i.slug} className="flex gap-5 py-5">
            <Image src={i.image} alt={i.name} width={112} height={112} unoptimized className="h-28 w-28 border-2 border-ink object-cover" />
            <div className="flex-1">
              <Link href={`/products/${i.slug}`} className="font-bold hover:underline hover:underline-offset-4">{i.name}</Link>
              <p className="text-sm text-muted">{formatPrice(i.pricePence)} each</p>
              <div className="mt-3 flex items-center gap-4">
                <label className="sr-only" htmlFor={`q-${i.slug}`}>Quantity for {i.name}</label>
                <input id={`q-${i.slug}`} type="number" min={1} max={20} value={i.qty} onChange={(e) => setQty(i.slug, Number(e.target.value) || 1)} className="w-20 border-2 border-ink bg-paper px-3 py-1.5 font-bold" />
                <button onClick={() => remove(i.slug)} className="text-sm underline underline-offset-4 hover:text-muted">Remove</button>
              </div>
            </div>
            <p className="font-bold">{formatPrice(i.pricePence * i.qty)}</p>
          </li>
        ))}
      </ul>
      <aside className="h-fit border-2 border-ink bg-paper-2 p-6">
        <h2 className="display text-3xl">Order summary</h2>
        <div className="-mx-6 mt-4 border-y-2 border-ink [&>div]:border-b-0"><FreeShippingBar /></div>
        <p className="mt-5 flex justify-between text-lg"><span>Subtotal</span><span className="font-bold">{formatPrice(subtotalPence)}</span></p>
        <p className="mt-1 text-sm text-muted">Shipping and taxes are calculated at checkout.</p>
        <button disabled className="btn mt-6 w-full" title="Payments are not connected yet">Checkout is not available yet</button>
      </aside>
    </div>
  );
}
