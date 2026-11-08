import { getCommerce } from "@/lib/commerce";
import { awardPoints, pointsForOrder } from "@/lib/rewards";
import type { Db } from "@/lib/db/clients";
import { giftCardEmail, orderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { recordDiscountUse } from "@/lib/discounts";
import { changeBalance, issueCard } from "@/lib/giftcards/ledger";
import type { Snapshot } from "./types";

export type OrderRow = {
  id: string; number: string; stripe_session_id: string | null; stripe_payment_intent: string; status: "paid" | "shipped" | "cancelled" | "attention";
  email: string; name: string; phone: string; shipping_address: Record<string, string> | null; items: Snapshot["lines"];
  subtotal_pence: number; shipping_pence: number; discount_code?: string; discount_pence?: number; gift_card_pence: number; total_pence: number; gift_card_code: string; gift_message?: string; gift_wrap?: boolean; gift_wrap_pence?: number;
  tracking_carrier: string; tracking_number: string; notes: string; attention_reason: string; shipped_at: string | null; created_at: string;
};
export type PaidSession = { sessionId: string; paymentIntent: string; email: string; name: string; phone: string; address: Record<string, string> | null };

async function nextNumber(db: Db): Promise<string> {
  const { count } = await db.from("orders").select("*", { count: "exact", head: true });
  return `${(await getCommerce()).codePrefix}-${1001 + (count ?? 0)}`;
}

/** Take tracked stock off one product (or one variant of it) and record if it was oversold. */
async function takeStock(db: Db, slug: string, variant: string | undefined, qty: number, label: string, problems: string[]) {
  const { data } = await db.from("products").select("slug,track_stock,stock_qty,variants").eq("slug", slug).maybeSingle();
  const p = data as { track_stock: boolean; stock_qty: number; variants: { name: string; stockQty: number }[] | null } | null;
  if (!p?.track_stock) return;
  if (variant && p.variants?.length) {
    // Per-variant stock is authoritative; the product total is the sum so the product sells out when every option has.
    let before = 0;
    const variants = p.variants.map((v) => { if (v.name !== variant) return v; before = v.stockQty; return { ...v, stockQty: Math.max(0, v.stockQty - qty) }; });
    const total = variants.reduce((n, v) => n + v.stockQty, 0);
    await db.from("products").update({ variants, stock_qty: total, in_stock: total > 0 }).eq("slug", slug);
    if (before < qty) problems.push(`${label} oversold: ${qty} bought, ${before} were in stock.`);
  } else {
    const left = Math.max(0, p.stock_qty - qty);
    await db.from("products").update({ stock_qty: left, ...(left === 0 ? { in_stock: false } : {}) }).eq("slug", slug);
    if (p.stock_qty < qty) problems.push(`${label} oversold: ${qty} bought, ${p.stock_qty} were in stock.`);
  }
}

/**
 * Turn a paid Checkout Session into an order. Safe to call twice for the same session (Stripe retries webhooks):
 * the second call returns the existing order and does nothing else.
 */
export async function fulfilOrder(db: Db, s: PaidSession): Promise<{ order: OrderRow; created: boolean }> {
  const existing = await db.from("orders").select("*").eq("stripe_session_id", s.sessionId).maybeSingle();
  if (existing.data) return { order: existing.data as OrderRow, created: false };

  const snap = await db.from("checkout_snapshots").select("*").eq("id", s.sessionId).maybeSingle();
  const payload = (snap.data as { payload: Snapshot } | null)?.payload ?? null;
  const problems: string[] = [];
  if (!payload) problems.push("Payment received but the basket snapshot was missing. Check the Stripe payment and fulfil manually.");

  // Create the order first so there is always a record of money taken, whatever happens next.
  let order: OrderRow | null = null;
  for (let i = 0; i < 5 && !order; i++) {
    const number = await nextNumber(db);
    const ins = await db.from("orders").insert({
      number, stripe_session_id: s.sessionId, stripe_payment_intent: s.paymentIntent, status: "paid", email: s.email, name: s.name, phone: s.phone,
      shipping_address: s.address, items: payload?.lines ?? [], subtotal_pence: payload?.subtotalPence ?? 0, shipping_pence: payload?.shippingPence ?? 0,
      discount_code: payload?.discount?.code ?? "", discount_pence: payload?.discount?.appliedPence ?? 0,
      gift_message: payload?.giftOptions?.message ?? "", gift_wrap: payload?.giftOptions?.wrap ?? false, gift_wrap_pence: payload?.giftOptions?.wrapPence ?? 0,
      gift_card_pence: payload?.giftCard?.appliedPence ?? 0, total_pence: payload?.totalPence ?? 0, gift_card_code: payload?.giftCard?.code ?? "",
    }).select("*").single();
    if (ins.error) {
      if (/duplicate|unique/i.test(ins.error.message)) {
        const again = await db.from("orders").select("*").eq("stripe_session_id", s.sessionId).maybeSingle();
        if (again.data) return { order: again.data as OrderRow, created: false }; // a concurrent webhook won
        continue;
      }
      throw new Error(`Could not save the order: ${ins.error.message}`);
    }
    order = ins.data as OrderRow;
  }
  if (!order) throw new Error("Could not allocate an order number.");

  if (payload) {
    // 0. Count the discount code use.
    if (payload.discount) { try { await recordDiscountUse(db, payload.discount.id); } catch { problems.push(`Discount code ${payload.discount.code} use could not be counted.`); } }
    // 1. Charge the gift card the customer used.
    if (payload.giftCard) {
      try { await changeBalance(db, payload.giftCard.cardId, -payload.giftCard.appliedPence, "redeem", { orderRef: order.number, note: "Used at checkout", createdBy: "checkout" }); }
      catch (e) { problems.push(`Gift card ${payload.giftCard.code} could not be charged (${e instanceof Error ? e.message : "error"}). The customer was already discounted.`); }
    }
    // 2. Issue purchased gift cards and email them.
    let giftCardsIssued = 0;
    for (const line of payload.lines) {
      if (line.type !== "gift") continue;
      for (let n = 0; n < line.qty; n++) {
        try {
          const card = await issueCard(db, { amountPence: line.unitPence, ...line.gift, source: "purchase", orderRef: order.number, note: `Bought by ${s.email}`, createdBy: "checkout" });
          giftCardsIssued++;
          const mail = giftCardEmail(card, (await getCommerce()).codePrefix);
          const sent = await sendEmail({ to: line.gift.recipientEmail, ...mail });
          if (sent.ok) await db.from("gift_cards").update({ emailed_at: new Date().toISOString() }).eq("id", card.id);
          else problems.push(`Gift card ${card.code} was created but the email to ${line.gift.recipientEmail} failed: ${sent.error}. Resend it from Admin > Gift cards.`);
        } catch (e) { problems.push(`A purchased gift card could not be created: ${e instanceof Error ? e.message : "error"}.`); }
      }
    }
    // 3. Take tracked stock off. A bundle takes stock off every product inside it.
    for (const line of payload.lines) {
      if (line.type !== "product") continue;
      const { data } = await db.from("products").select("bundle_items").eq("slug", line.slug).maybeSingle();
      const items = (data as { bundle_items: { slug: string; qty: number }[] | null } | null)?.bundle_items ?? [];
      if (items.length) { for (const it of items) await takeStock(db, it.slug, undefined, it.qty * line.qty, `${line.name} (contains ${it.slug})`, problems); }
      else await takeStock(db, line.slug, line.variant, line.qty, line.name, problems);
    }
    // 3b. Spark points for signed-up customers (matched by email, so it works whether or not they were logged in at checkout).
    if (s.email) { try { await awardPoints(db, { email: s.email, points: pointsForOrder(payload), reason: "order", ref: order.number, note: `Order ${order.number}` }); } catch { problems.push("Spark points could not be added for this order."); } }
    // 4. Confirmation email.
    const mail = orderEmail({ number: order.number, name: s.name, lines: payload.lines, subtotalPence: payload.subtotalPence, shippingPence: payload.shippingPence, discountPence: payload.discount?.appliedPence ?? 0, discountCode: payload.discount?.code ?? "", giftWrapPence: payload.giftOptions?.wrapPence ?? 0, giftMessage: payload.giftOptions?.message ?? "", giftCardPence: payload.giftCard?.appliedPence ?? 0, totalPence: payload.totalPence, address: s.address, giftCardsIssued });
    const sent = s.email ? await sendEmail({ to: s.email, ...mail }) : { ok: false as const, error: "no email address" };
    if (!sent.ok) problems.push(`Order confirmation email not sent: ${sent.error}`);
    await db.from("checkout_snapshots").update({ fulfilled_at: new Date().toISOString() }).eq("id", s.sessionId);
  }

  if (problems.length) {
    const status = problems.some((p) => !p.startsWith("Order confirmation email")) ? "attention" : "paid";
    await db.from("orders").update({ attention_reason: problems.join("\n"), status }).eq("id", order.id);
    order = { ...order, attention_reason: problems.join("\n"), status };
  }
  return { order, created: true };
}
