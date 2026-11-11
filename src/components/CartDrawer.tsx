"use client";

import Image from "next/image";
import Link from "next/link";
import { useAddToBasket } from "@/components/useAddToBasket";
import { useCart } from "@/components/CartProvider";
import { FreeShippingBar } from "@/components/FreeShippingBar";
import { SlideOver } from "@/components/SlideOver";
import type { QuickProduct } from "@/lib/card";
import { useMoney } from "@/components/Currency";

export function CartDrawer({ suggestions = [] }: { suggestions?: QuickProduct[] }) {
  const money = useMoney();
  const { isOpen, closeCart, items, subtotalPence, setQty, remove } = useCart();
  const addOrChoose = useAddToBasket();
  const more = suggestions.filter((s) => s.inStock && !items.some((i) => i.slug === s.slug)).slice(0, 3);
  return (
    <SlideOver open={isOpen} onClose={closeCart} title="Your basket">
      {items.length === 0 ? (
          <div className="flex-1 p-6">
            <p className="serif text-xl text-muted">Your basket is empty.</p>
            <Link href="/new" onClick={closeCart} className="btn mt-6">Shop new arrivals</Link>
          </div>
        ) : (
          <>
            <FreeShippingBar />
            <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-ink/20 px-5">
              {items.map((i) => (
                <li key={i.slug} className="flex gap-4 py-4">
                  <Image src={i.image} alt={i.name} width={80} height={80} unoptimized className={`h-20 w-20 border border-white/20 object-cover ${i.href ? "bg-black !object-contain p-2" : ""}`} />
                  <div className="flex-1">
                    <Link href={i.href ?? `/products/${i.slug}`} onClick={closeCart} className="font-bold leading-snug hover:underline hover:underline-offset-4">{i.name}</Link>
              {i.note ? <p className="text-sm text-muted">{i.note}</p> : null}
                    <p className="text-sm text-muted">{money(i.pricePence)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center border border-white/20">
                        <button aria-label={`Decrease quantity of ${i.name}`} onClick={() => setQty(i.slug, i.qty - 1)} className="px-2.5 py-0.5 font-bold">−</button>
                        <span className="min-w-6 text-center text-sm font-bold" aria-live="polite">{i.qty}</span>
                        <button aria-label={`Increase quantity of ${i.name}`} onClick={() => setQty(i.slug, i.qty + 1)} className="px-2.5 py-0.5 font-bold">+</button>
                      </div>
                      <button onClick={() => remove(i.slug)} className="text-sm underline underline-offset-4 hover:text-muted">Remove</button>
                    </div>
                  </div>
                  <p className="font-bold">{money(i.pricePence * i.qty)}</p>
                </li>
              ))}
            </ul>
            {more.length > 0 && (
              <section className="border-t border-white/15 px-5 py-5" aria-labelledby="more-h">
                <h3 id="more-h" className="display text-2xl">You may also like</h3>
                <ul className="mt-3 space-y-3">
                  {more.map((s) => (
                    <li key={s.slug} className="flex items-center gap-3">
                      <Image src={s.image} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 border border-white/20 object-cover" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${s.slug}`} onClick={closeCart} className="block truncate font-bold hover:underline hover:underline-offset-4">{s.name}</Link>
                        <p className="text-sm text-muted">{money(s.pricePence)}</p>
                      </div>
                      <button onClick={() => { if (s.variants.length) closeCart(); addOrChoose(s); }} className="btn btn-sm">{s.variants.length ? "Options" : "Add"}</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            </div>
            <div className="border-t border-white/15 p-5">
              <p className="flex justify-between text-lg"><span>Subtotal</span><span className="font-bold">{money(subtotalPence)}</span></p>
              <p className="mt-1 text-sm text-muted">Shipping and taxes are calculated at checkout.</p>
              <div className="mt-4 grid gap-3">
                <Link href="/cart" onClick={closeCart} className="btn">Checkout</Link>
                <Link href="/cart" onClick={closeCart} className="btn btn-ink">View basket</Link>
              </div>
            </div>
          </>
        )}
    </SlideOver>
  );
}
