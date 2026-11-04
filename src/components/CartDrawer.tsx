"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/site";

export function CartDrawer() {
  const { isOpen, closeCart, items, subtotalPence, setQty, remove } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Basket">
      <button aria-label="Close basket" tabIndex={-1} onClick={closeCart} className="absolute inset-0 bg-ink/60" />
      <aside className="absolute right-0 top-0 flex h-full w-[min(28rem,100vw)] flex-col border-l-2 border-ink bg-paper">
        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
          <h2 className="display text-3xl">Your basket</h2>
          <button ref={closeRef} onClick={closeCart} className="px-2 py-1 font-bold underline underline-offset-4">Close</button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 p-6">
            <p className="serif text-xl text-muted">Your basket is empty.</p>
            <Link href="/new" onClick={closeCart} className="btn mt-6">Shop new arrivals</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink/20 overflow-y-auto px-5">
              {items.map((i) => (
                <li key={i.slug} className="flex gap-4 py-4">
                  <Image src={i.image} alt={i.name} width={80} height={80} unoptimized className="h-20 w-20 border-2 border-ink object-cover" />
                  <div className="flex-1">
                    <Link href={`/products/${i.slug}`} onClick={closeCart} className="font-bold leading-snug hover:underline hover:underline-offset-4">{i.name}</Link>
                    <p className="text-sm text-muted">{formatPrice(i.pricePence)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center border-2 border-ink">
                        <button aria-label={`Decrease quantity of ${i.name}`} onClick={() => setQty(i.slug, i.qty - 1)} className="px-2.5 py-0.5 font-bold">−</button>
                        <span className="min-w-6 text-center text-sm font-bold" aria-live="polite">{i.qty}</span>
                        <button aria-label={`Increase quantity of ${i.name}`} onClick={() => setQty(i.slug, i.qty + 1)} className="px-2.5 py-0.5 font-bold">+</button>
                      </div>
                      <button onClick={() => remove(i.slug)} className="text-sm underline underline-offset-4 hover:text-muted">Remove</button>
                    </div>
                  </div>
                  <p className="font-bold">{formatPrice(i.pricePence * i.qty)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t-2 border-ink p-5">
              <p className="flex justify-between text-lg"><span>Subtotal</span><span className="font-bold">{formatPrice(subtotalPence)}</span></p>
              <p className="mt-1 text-sm text-muted">Shipping and taxes are calculated at checkout.</p>
              <div className="mt-4 grid gap-3">
                <Link href="/cart" onClick={closeCart} className="btn btn-ink">View basket</Link>
                <button disabled className="btn" title="Payments are not connected yet">Checkout is not available yet</button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
