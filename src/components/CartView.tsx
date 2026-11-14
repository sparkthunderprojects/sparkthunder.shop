"use client";
import { useT } from "@/components/LocaleProvider";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { startCheckoutAction } from "@/app/(shop)/checkout/actions";
import { quoteOffersAction, type OffersQuote } from "@/app/(shop)/checkout/discount";
import { combineOffers } from "@/lib/promotions";
import { BasketReminder } from "@/components/BasketReminder";
import Link from "@/components/LocaleLink";
import { useCart } from "@/components/CartProvider";
import { FreeShippingBar } from "@/components/FreeShippingBar";
import { DiscountApply, useDiscount } from "@/components/DiscountApply";
import { GiftCardApply, useAppliedGiftCard } from "@/components/GiftCardApply";
import { isGiftCardLine } from "@/lib/giftcards/format";
import { useCurrency, useMoney } from "@/components/Currency";
import { formatMoney } from "@/lib/currency";
import { useCommerce } from "@/components/CommerceProvider";
import { quoteShipping } from "@/lib/commerce-config";

const countryName = (code: string, loc = "en") => { try { return new Intl.DisplayNames([loc], { type: "region" }).of(code) ?? code; } catch { return code; } };

export function CartView() {
  const { t, locale } = useT();
  const money = useMoney();
  const cur = useCurrency();
  const { items, subtotalPence, setQty, remove } = useCart();
  const { card, setCard } = useAppliedGiftCard();
  // A gift card cannot pay for another gift card.
  const payable = items.filter((i) => !isGiftCardLine(i.slug)).reduce((n, i) => n + i.pricePence * i.qty, 0);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const cartInput = items.map((i) => ({ slug: i.slug, qty: i.qty, pricePence: i.pricePence, gift: i.gift }));
  const physical = items.some((i) => !isGiftCardLine(i.slug));
  const [gift, setGift] = useState(false);
  const [wrap, setWrap] = useState(false);
  const commerce = useCommerce();
  const GIFT_WRAP_PENCE = commerce.giftWrapPence;
  const country = cur.country, setCountry = cur.setRegion;
  const physicalItems = items.filter((i) => !isGiftCardLine(i.slug));
  const [note, setNote] = useState("");
  const wrapPence = physical && gift && wrap ? GIFT_WRAP_PENCE : 0;
  const disc = useDiscount(cartInput);
  const [offers, setOffers] = useState<OffersQuote>({ promo: null, freeShippingBy: null, grams: 0 });
  const ship = physical ? quoteShipping(commerce, country, physicalItems.reduce((n, i) => n + i.qty, 0), payable, offers.grams) : null;
  const offerKey = JSON.stringify(cartInput.map((c) => [c.slug, c.qty]));
  useEffect(() => { let live = true; quoteOffersAction(cartInput).then((o) => { if (live) setOffers(o); }).catch(() => {}); return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerKey]);
  const mix = combineOffers(offers.promo?.amountPence ?? 0, offers.promo?.stacks ?? false, disc.amountPence, payable);
  const discount = mix.codePence;
  const promoOff = mix.promoPence;
  const applied = card ? Math.min(card.balancePence, payable - discount - promoOff) : 0;

  if (items.length === 0) {
    return (
      <div className="mt-8">
        <p className="serif text-xl text-muted">{t("Your basket is empty.")}</p>
        <Link href="/new" className="btn mt-6">{t("Shop new arrivals")}</Link>
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
              <p className="text-sm text-muted">{t("{price} each", { price: money(i.pricePence) })}</p>
              <div className="mt-3 flex items-center gap-4">
                <label className="sr-only" htmlFor={`q-${i.slug}`}>{t("Quantity for {name}", { name: i.name })}</label>
                <input id={`q-${i.slug}`} type="number" min={1} max={20} value={i.qty} onChange={(e) => setQty(i.slug, Number(e.target.value) || 1)} className="w-20 border border-ink/20 bg-paper px-3 py-1.5 font-bold" />
                <button onClick={() => remove(i.slug)} className="text-sm underline underline-offset-4 hover:text-muted">{t("Remove")}</button>
              </div>
            </div>
            <p className="font-bold">{money(i.pricePence * i.qty)}</p>
          </li>
        ))}
      </ul>
      <aside className="h-fit border border-ink/20 bg-paper-2 p-6">
        <h2 className="display text-3xl">{t("Order summary")}</h2>
        <div className="-mx-6 mt-4 border-y border-ink/15 [&>div]:border-b-0"><FreeShippingBar /></div>
        <p className="mt-5 flex justify-between text-lg"><span>{t("Subtotal")}</span><span className="font-bold">{money(subtotalPence)}</span></p>
        <DiscountApply code={disc.code} setCode={disc.setCode} quote={disc.quote} />
        {promoOff > 0 ? <p className="mt-3 flex justify-between"><span>{offers.promo?.name}</span><span className="font-bold">-{money(promoOff)}</span></p> : null}
        {discount > 0 ? <p className="mt-3 flex justify-between"><span>{t("Discount")}</span><span className="font-bold">-{money(discount)}</span></p> : null}
        <GiftCardApply card={card} setCard={setCard} />
        {applied > 0 ? <p className="mt-3 flex justify-between"><span>{t("Gift card")}</span><span className="font-bold">-{money(applied)}</span></p> : null}
        {wrapPence > 0 ? <p className="mt-3 flex justify-between"><span>{t("Gift wrap")}</span><span className="font-bold">{money(wrapPence)}</span></p> : null}
        {discount > 0 || promoOff > 0 || applied > 0 || wrapPence > 0 ? <p className="mt-1 flex justify-between text-lg"><span>{t("To pay")}</span><span className="font-bold">{money(subtotalPence + wrapPence - discount - promoOff - applied)}</span></p> : null}
        {physical ? (
          <div className="mt-5 border-t border-ink/15 pt-4">
            <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} /> {t("This order is a gift")}</label>
            {gift ? (
              <div className="mt-3 grid gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> {t("Gift wrap it ({price})", { price: GIFT_WRAP_PENCE ? `+${money(GIFT_WRAP_PENCE)}` : t("free") })}</label>
                <label className="grid gap-1 text-sm font-bold">{t("Gift message (optional, we print it, no prices)")}
                  <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={3} maxLength={200} className="border border-ink/30 bg-paper px-3 py-2 font-normal" />
                  <span className="text-xs font-normal text-muted">{note.length}/200</span>
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
        {!(applied > 0) && card && payable === 0 ? <p className="mt-2 text-sm text-muted">{t("Gift cards cannot be used to buy other gift cards.")}</p> : null}
        {physical ? (
          <div className="mt-5 border-t border-ink/15 pt-4">
            {commerce.shippingCountries.length > 1 ? (
              <label className="grid gap-1 text-sm font-bold">{t("Deliver to")}
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="border border-ink/30 bg-paper px-3 py-2 font-normal">
                  {commerce.shippingCountries.map((c) => <option key={c} value={c}>{countryName(c, locale)}</option>)}
                </select>
              </label>
            ) : null}
            {ship?.ok ? (
              <>
                <p className="mt-3 flex justify-between"><span>{t("Delivery")}{commerce.shippingZones.length ? ` (${ship.zone})` : ""}</span><span className="font-bold">{ship.pence && !offers.freeShippingBy ? money(ship.pence) : t("Free")}</span></p>
                {offers.freeShippingBy && ship.pence > 0 ? <p className="mt-1 text-sm text-muted">{offers.freeShippingBy}</p> : null}
                {ship.freeOverPence && ship.pence > 0 && !offers.freeShippingBy ? <p className="mt-1 text-sm text-muted">{t("Spend {amount} more for free delivery.", { amount: money(ship.freeOverPence - payable) })}</p> : null}
                <p className="mt-1 flex justify-between text-lg"><span>{t("Estimated total")}</span><span className="font-bold">{money(subtotalPence + wrapPence + (offers.freeShippingBy ? 0 : ship.pence) - discount - promoOff - applied)}</span></p>
                {cur.code !== cur.base ? <p className="mt-1 flex justify-between text-sm"><span>{t("You will be charged")}</span><span className="font-bold">{formatMoney(subtotalPence + wrapPence + (offers.freeShippingBy ? 0 : ship.pence) - discount - promoOff - applied, cur.base)}</span></p> : null}
              </>
            ) : ship ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{t(ship.error)}</p> : null}
          </div>
        ) : null}
        <p className="mt-1 text-sm text-muted">{t("Taxes are included in prices where they apply.")}{cur.code !== cur.base ? t(" Prices in {currency} are approximate: you pay in {base}, and the exact amount is shown at checkout.", { currency: cur.code, base: cur.base }) : ""}</p>
        <button className="btn mt-6 w-full" disabled={busy} onClick={() => { setErr(""); start(async () => {
          const r = await startCheckoutAction(cartInput, applied > 0 && card ? card.code : null, disc.code, physical && gift ? { message: note, wrap } : null, physical ? country : null);
          if (r.ok) window.location.href = r.url; else setErr(r.error);
        }); }}>{busy ? t("Starting checkout...") : t("Checkout")}</button>
        {err ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">{t(err)}</p> : null}
        <BasketReminder cart={cartInput} />
      </aside>
    </div>
  );
}
