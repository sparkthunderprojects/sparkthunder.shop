"use server";

import { serviceClient } from "@/lib/db/clients";
import { isDemo } from "@/lib/db/env";
import { buildPlan, SHIPPING_COUNTRIES, SHIPPING_FLAT_PENCE } from "@/lib/shop/plan";
import { getStripe, hasStripe } from "@/lib/shop/stripe";
import type { CartInput, GiftOptionsInput } from "@/lib/shop/types";
import { siteOrigin } from "@/lib/site-info";

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

export async function startCheckoutAction(cart: CartInput, giftCode: string | null, discountCode: string | null = null, giftOpts: GiftOptionsInput | null = null): Promise<CheckoutResult> {
  try {
    const db = serviceClient();
    const demoPay = isDemo && !hasStripe();
    if (!db || (!hasStripe() && !demoPay)) return { ok: false, error: "Checkout is not switched on yet. Please check back soon." };

    const plan = await buildPlan(db, cart, giftCode, discountCode, giftOpts);
    if (!plan.ok) return plan;
    const snap = plan.snapshot;

    // Local demo: no Stripe. Record the snapshot and send the browser to a fake "payment complete" step.
    if (demoPay) {
      const id = `cs_demo_${Math.random().toString(36).slice(2, 10)}`;
      await db.from("checkout_snapshots").insert({ id, payload: snap });
      return { ok: true, url: `/api/dev/complete?id=${id}` };
    }

    const stripe = getStripe();
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
      const name = snap.discount && snap.giftCard ? "Discount code and gift card" : snap.discount ? "Discount code" : "Sparkthunder gift card";
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
        shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES as never },
        phone_number_collection: { enabled: true },
        shipping_options: [{ shipping_rate_data: { type: "fixed_amount" as const, display_name: snap.shippingPence ? "Standard delivery" : "Free delivery", fixed_amount: { amount: snap.shippingPence, currency: "gbp" } } }],
      } : {}),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });
    const saved = await db.from("checkout_snapshots").insert({ id: session.id, payload: snap });
    if (saved.error || !session.url) {
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      return { ok: false, error: "We could not start checkout. Please try again." };
    }
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[checkout]", e);
    return { ok: false, error: "We could not start checkout. Please try again in a moment." };
  }
}

export const shippingInfo = async () => ({ flat: SHIPPING_FLAT_PENCE, countries: SHIPPING_COUNTRIES });
