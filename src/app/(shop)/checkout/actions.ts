"use server";

import { log } from "@/lib/log";
import { rateLimit, LIMITS, wait } from "@/lib/ratelimit";
import { serviceClient } from "@/lib/db/clients";
import { isDemo } from "@/lib/db/env";
import { buildPlan } from "@/lib/shop/plan";
import { getCommerce } from "@/lib/commerce";
import { getStripe, hasStripe } from "@/lib/shop/stripe";
import type { CartInput, GiftOptionsInput } from "@/lib/shop/types";
import { siteOrigin } from "@/lib/site-info";
import { cookies } from "next/headers";
import { currentStoreId } from "@/lib/db/stores";
import { getStore } from "@/lib/store";
import { holdStock, releaseStock, stockItems, STRIPE_SESSION_MINUTES } from "@/lib/shop/stock";

const HOLD_COOKIE = "spark-hold";

/** One hold per shopper: starting checkout again replaces their earlier hold instead of blocking them with it. */
async function holdKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(HOLD_COOKIE)?.value;
  if (existing && /^rsv_[a-z0-9]{16,}$/.test(existing)) return existing;
  const key = `rsv_${crypto.randomUUID().replace(/-/g, "")}`;
  jar.set(HOLD_COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 6, path: "/" });
  return key;
}

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

export async function startCheckoutAction(cart: CartInput, giftCode: string | null, discountCode: string | null = null, giftOpts: GiftOptionsInput | null = null): Promise<CheckoutResult> {
  try {
    const rl = await rateLimit("checkout", LIMITS.checkout);
    if (!rl.ok) return { ok: false, error: `Too many checkout attempts. Please wait ${wait(rl)} and try again.` };
    const db = serviceClient();
    const stripeOn = await hasStripe();
    const demoPay = isDemo && !stripeOn;
    if (!db || (!stripeOn && !demoPay)) return { ok: false, error: "Checkout is not switched on yet. Please check back soon." };

    const plan = await buildPlan(db, cart, giftCode, discountCode, giftOpts);
    if (!plan.ok) return plan;
    const snap = plan.snapshot;

    // Hold the stock for this checkout so the last unit cannot be sold twice while the shopper is paying.
    const storeId = await currentStoreId();
    const key = await holdKey();
    const held = await holdStock(db, storeId, key, await stockItems(db, snap.lines));
    if (!held.ok) return { ok: false, error: held.message };
    snap.reservation = key;

    // Local demo: no Stripe. Record the snapshot and send the browser to a fake "payment complete" step.
    if (demoPay) {
      const id = `cs_demo_${Math.random().toString(36).slice(2, 10)}`;
      await db.from("checkout_snapshots").insert({ id, payload: snap });
      return { ok: true, url: `/api/dev/complete?id=${id}` };
    }

    try {
    const stripe = await getStripe();
    const line_items = snap.lines.map((l) => ({
      quantity: l.qty,
      price_data: { currency: "gbp", unit_amount: l.unitPence, product_data: { name: l.name, ...(l.type === "product" && l.image ? { images: [l.image] } : {}) } },
    }));
    if (snap.giftOptions && snap.giftOptions.wrapPence > 0) {
      line_items.push({ quantity: 1, price_data: { currency: "gbp", unit_amount: snap.giftOptions.wrapPence, product_data: { name: "Gift wrap" } } });
    }
    let discounts: { coupon: string }[] | undefined;
    // Stripe takes one coupon per session, so the discount code and gift card are combined into a single amount off.
    const off = (snap.discount?.appliedPence ?? 0) + (snap.giftCard?.appliedPence ?? 0);
    if (off > 0) {
      const name = snap.discount && snap.giftCard ? "Discount code and gift card" : snap.discount ? "Discount code" : `${(await getStore()).name} gift card`;
      const coupon = await stripe.coupons.create({ amount_off: off, currency: "gbp", duration: "once", max_redemptions: 1, name });
      discounts = [{ coupon: coupon.id }];
    }
    const origin = await siteOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      ...(discounts ? { discounts } : {}),
      payment_method_collection: "if_required",
      ...(snap.needsShipping ? {
        shipping_address_collection: { allowed_countries: (await getCommerce()).shippingCountries as never },
        phone_number_collection: { enabled: true },
        shipping_options: [{ shipping_rate_data: { type: "fixed_amount" as const, display_name: snap.shippingPence ? "Standard delivery" : "Free delivery", fixed_amount: { amount: snap.shippingPence, currency: "gbp" } } }],
      } : {}),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      // The payment page closes before the stock hold runs out, so nobody can pay for items that are no longer held.
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_MINUTES * 60,
    });
    const saved = await db.from("checkout_snapshots").insert({ id: session.id, payload: snap });
    if (saved.error || !session.url) {
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      await releaseStock(db, storeId, key);
      return { ok: false, error: "We could not start checkout. Please try again." };
    }
    return { ok: true, url: session.url };
    } catch (e) {
      await releaseStock(db, storeId, key); // do not keep stock held for a checkout that never started
      throw e;
    }
  } catch (e) {
    await log.error("checkout.failed", "Could not start checkout", { error: e });
    return { ok: false, error: "We could not start checkout. Please try again in a moment." };
  }
}

export const shippingInfo = async () => { const c = await getCommerce(); return { flat: c.shippingFlatPence, countries: c.shippingCountries }; };
