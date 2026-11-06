"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { startCheckoutAction } from "@/app/(shop)/checkout/actions";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { FreeShippingBar } from "@/components/FreeShippingBar";
import { DiscountApply, useDiscount } from "@/components/DiscountApply";
import { GiftCardApply, useAppliedGiftCard } from "@/components/GiftCardApply";
import { isGiftCardLine } from "@/lib/giftcards/format";
import { formatPrice } from "@/lib/site";

export function CartView() {
  const { items, subtotalPence, setQty, remove } = useCart();
  const { card, setCard } = useAppliedGiftCard();
  // A gift card cannot pay for another gift card.
  const payable = items.filter((i) => !isGiftCardLine(i.slug)).reduce((n, i) => n + i.pricePence * i.qty, 0);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const cartInput = items.map((i) => ({ slug: i.slug, qty: i.qty, pricePence: i.pricePence, gift: i.gift }));
  const disc = useDiscount(cartInput);
  const discount = Math.min(disc.amountPence, payable);
  const applied = card ? Math.min(card.balancePence, payable - discount) : 0;

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
      <ul className="divide-y-2 divide-ink border-y border-ink/15">
        {items.map((i) => (
          <li key={i.slug} className="flex gap-5 py-5">
            <Image src={i.image} alt={i.name} width={112} height={112} unoptimized className={`h-28 w-28 border border-ink/20 object-cover ${i.href ? "bg-black !object-contain p-2" : ""}`} />
            <div className="flex-1">
              <Link href={i.href ?? `/products/${i.slug}`} className="font-bold hover:underline hover:underline-offset-4">{i.name}</Link>
              {i.note ? <p className="text-sm text-muted">{i.note}</p> : null}
              <p className="text-sm text-muted">{formatPrice(i.pricePence)} each</p>
              <div className="mt-3 flex items-center gap-4">
                <label className="sr-only" htmlFor={`q-${i.slug}`}>Quantity for {i.name}</label>
                <input id={`q-${i.slug}`} type="number" min={1} max={20} value={i.qty} onChange={(e) => setQty(i.slug, Number(e.target.value) || 1)} className="w-20 border border-ink/20 bg-paper px-3 py-1.5 font-bold" />
                <button onClick={() => remove(i.slug)} className="text-sm underline underline-offset-4 hover:text-muted">Remove</button>
              </div>
            </div>
            <p className="font-bold">{formatPrice(i.pricePence * i.qty)}</p>
          </li>
        ))}
      </ul>
      <aside className="h-fit border border-ink/20 bg-paper-2 p-6">
        <h2 className="display text-3xl">Order summary</h2>
        <div className="-mx-6 mt-4 border-y border-ink/15 [&>div]:border-b-0"><FreeShippingBar /></div>
        <p className="mt-5 flex justify-between text-lg"><span>Subtotal</span><span className="font-bold">{formatPrice(subtotalPence)}</span></p>
        <DiscountApply code={disc.code} setCode={disc.setCode} quote={disc.quote} />
        {discount > 0 ? <p className="mt-3 flex justify-between"><span>Discount</span><span className="font-bold">-{formatPrice(discount)}</span></p> : null}
        <GiftCardApply card={card} setCard={setCard} />
        {applied > 0 ? <p className="mt-3 flex justify-between"><span>Gift card</span><span className="font-bold">-{formatPrice(applied)}</span></p> : null}
        {discount > 0 || applied > 0 ? <p className="mt-1 flex justify-between text-lg"><span>To pay</span><span className="font-bold">{formatPrice(subtotalPence - discount - applied)}</span></p> : null}
        {!(applied > 0) && card && payable === 0 ? <p className="mt-2 text-sm text-muted">Gift cards cannot be used to buy other gift cards.</p> : null}
        <p className="mt-1 text-sm text-muted">Shipping and taxes are calculated at checkout.</p>
        <button className="btn mt-6 w-full" disabled={busy} onClick={() => { setErr(""); start(async () => {
          const r = await startCheckoutAction(cartInput, applied > 0 && card ? card.code : null, disc.code);
          if (r.ok) window.location.href = r.url; else setErr(r.error);
        }); }}>{busy ? "Starting checkout..." : "Checkout"}</button>
        {err ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">{err}</p> : null}
      </aside>
    </div>
  );
}
