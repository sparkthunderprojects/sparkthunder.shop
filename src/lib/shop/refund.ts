import { emitEvent, publicOrder } from "@/lib/webhooks/outbound";
import type { Db } from "@/lib/db/clients";
import { refundEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { changeBalance, getCardByCode } from "@/lib/giftcards/ledger";
import { awardPoints } from "@/lib/rewards";
import type { OrderRow } from "./fulfil";
import { stockItems } from "./stock";
import { getStoreSecrets } from "@/lib/secrets";
import { Printify, PrintifyError } from "@/lib/printify/api";

/** The slice of the Stripe client refunds need (so tests can stand in for Stripe). */
export type RefundStripe = { refunds: { create(p: { payment_intent: string; amount: number; metadata?: Record<string, string> }, o?: { idempotencyKey?: string }): Promise<{ id: string }> } };

export type RefundInput = {
  orderId: string;
  /** One per click of the Refund button. Sending the same key again never refunds twice. */
  key: string;
  cardPence: number;
  giftPence: number;
  /** Which order lines come back to the shelf: index into the order's items, and how many. */
  restock: { line: number; qty: number }[];
  takePoints: boolean;
  reason: string;
  by: string;
};

export type RefundSteps = { stripe?: boolean; gift?: boolean; stock?: string[]; points?: number | null; emailed?: boolean; problems?: string[] };
export type RefundRow = {
  id: string; order_id: string; key: string; card_pence: number; gift_pence: number; reason: string; restock: { slug: string; variant: string; qty: number }[];
  take_points: boolean; source: string; status: "pending" | "done" | "failed"; steps: RefundSteps; stripe_refund_id: string | null; error: string; created_by: string; created_at: string;
};
export type RefundResult = { ok: true; refund: RefundRow; problems: string[] } | { ok: false; error: string; retry?: boolean; refundId?: string };

class Business extends Error {}
/** Stripe errors that mean "no, and asking again will not help" (as opposed to a network blip, which is retried). */
const definite = (e: unknown) => { const t = (e as { type?: string })?.type; return t === "StripeInvalidRequestError" || t === "StripeCardError" || t === "StripePermissionError"; };

/** Start a refund and carry it out. Safe to repeat with the same key: finished steps are skipped. */
export async function createRefund(db: Db, stripe: RefundStripe | null, storeId: string, input: RefundInput): Promise<RefundResult> {
  const { data } = await db.from("orders").select("*").eq("id", input.orderId).maybeSingle();
  const o = data as OrderRow | null;
  if (!o) return { ok: false, error: "Order not found." };
  const { cardPence, giftPence } = input;
  if (![cardPence, giftPence].every((n) => Number.isInteger(n) && n >= 0)) return { ok: false, error: "Enter whole amounts." };
  if (cardPence > 0 && !o.stripe_payment_intent) return { ok: false, error: "This order has no card payment to refund." };
  if (giftPence > 0 && !o.gift_card_code) return { ok: false, error: "This order was not paid with a gift card." };

  // Which items go back on the shelf (bundles come back as the products inside them).
  const restock: { slug: string; variant: string; qty: number }[] = [];
  for (const r of input.restock) {
    const line = o.items[r.line];
    if (!line || line.type !== "product") continue;
    const qty = Math.max(0, Math.min(Math.floor(r.qty), line.qty));
    if (!qty) continue;
    for (const it of await stockItems(db, [{ ...line, qty }])) restock.push({ slug: it.slug, variant: it.variant, qty: it.qty });
  }

  const { data: begun, error } = await db.rpc("begin_refund", { p_store: storeId, p_order: input.orderId, p_key: input.key, p_card: cardPence, p_gift: giftPence, p_reason: input.reason.trim().slice(0, 500), p_restock: restock, p_points: input.takePoints, p_by: input.by });
  if (error) return { ok: false, error: `${error.message}. Run the latest supabase/admin.sql.` };
  const b = begun as { status: "created" | "existing" | "rejected"; id?: string; error?: string };
  if (b.status === "rejected") return { ok: false, error: b.error ?? "That refund is not allowed." };
  return processRefund(db, stripe, storeId, b.id!);
}

/** Carry out (or finish) one refund. Each step is recorded when done, so a crash or retry only does what is left. */
export async function processRefund(db: Db, stripe: RefundStripe | null, storeId: string, refundId: string): Promise<RefundResult> {
  const { data } = await db.from("order_refunds").select("*").eq("id", refundId).maybeSingle();
  const r = data as RefundRow | null;
  if (!r) return { ok: false, error: "Refund not found." };
  const { data: od } = await db.from("orders").select("*").eq("id", r.order_id).maybeSingle();
  const o = od as OrderRow;
  if (r.status === "failed") return { ok: false, error: r.error || "That refund failed. Start a new one.", refundId };
  const steps: RefundSteps = { ...r.steps };
  const problems = new Set(steps.problems ?? []);
  const save = async (extra: Record<string, unknown> = {}) => {
    const { error } = await db.from("order_refunds").update({ steps: { ...steps, problems: [...problems] }, ...extra }).eq("id", refundId);
    if (error) throw new Error(`Could not save refund progress: ${error.message}`);
  };

  // 1. Money back to the card. Stripe's idempotency key is this refund's id, so asking twice makes one refund.
  if (r.card_pence > 0 && !steps.stripe) {
    if (!stripe) { await db.rpc("fail_refund", { p_store: storeId, p_id: refundId, p_error: "Stripe is not configured for this store." }); return { ok: false, error: "Stripe is not configured for this store.", refundId }; }
    try {
      const sr = await stripe.refunds.create({ payment_intent: o.stripe_payment_intent, amount: r.card_pence, metadata: { spark_refund: refundId, order: o.number } }, { idempotencyKey: `spark_refund_${refundId}` });
      steps.stripe = true; await save({ stripe_refund_id: sr.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe error";
      if (definite(e)) {
        await db.rpc("fail_refund", { p_store: storeId, p_id: refundId, p_error: msg });
        return { ok: false, error: `Stripe refused the refund: ${msg}`, refundId };
      }
      await db.from("order_refunds").update({ error: msg }).eq("id", refundId);
      return { ok: false, error: `Could not reach Stripe (${msg}). Nothing was lost; press Retry.`, retry: true, refundId };
    }
  }

  const run = async (label: string, fn: () => Promise<void>) => {
    try { await fn(); return true; }
    catch (e) {
      if (e instanceof Business) { problems.add(e.message); return true; }
      problems.add(`${label} did not finish (${e instanceof Error ? e.message : "error"}). Press Retry.`); return false;
    }
  };
  let allDone = true;

  // 2. Money back onto the gift card (once: the card's history is checked first).
  if (r.gift_pence > 0 && !steps.gift) {
    const ok = await run("Returning money to the gift card", async () => {
      const card = await getCardByCode(db, o.gift_card_code);
      if (!card) throw new Business(`Gift card ${o.gift_card_code} no longer exists, so ${(r.gift_pence / 100).toFixed(2)} could not be returned to it. Refund that amount another way.`);
      const ref = `refund:${refundId}`;
      for (let i = 0; i < 4; i++) {
        const { data: seen } = await db.from("gift_card_ledger").select("id").eq("card_id", card.id).eq("kind", "refund").eq("order_ref", ref).maybeSingle();
        if (seen) return;
        try { await changeBalance(db, card.id, r.gift_pence, "refund", { orderRef: ref, note: `Refund of order ${o.number}`, createdBy: r.created_by }); return; }
        catch (e) { if (!(e instanceof Error && /balance changed/i.test(e.message)) || i === 3) throw e; }
      }
    });
    if (ok) { steps.gift = true; await save(); } else allDone = false;
  }

  // 3. Items back on the shelf (once per refund and product, in the database).
  steps.stock ??= [];
  for (const it of r.restock) {
    const k = `${it.slug}:${it.variant}`;
    if (steps.stock.includes(k)) continue;
    const ok = await run(`Restocking ${it.slug}`, async () => {
      const { error } = await db.rpc("restock_item", { p_store: storeId, p_refund: refundId, p_slug: it.slug, p_variant: it.variant, p_qty: it.qty });
      if (error) throw new Error(error.message);
    });
    if (ok) { steps.stock.push(k); await save(); } else allDone = false;
  }

  // 4. Take back Spark points, in proportion to how much of the order was refunded (never more than were earned).
  if (r.take_points && steps.points === undefined) {
    const ok = await run("Taking back Spark points", async () => {
      const spent = o.items.reduce((n, l) => n + (l.type === "product" ? l.unitPence * l.qty : 0), 0) - (o.discount_pence ?? 0);
      const earned = Math.max(0, Math.floor(spent / 100));
      const { data: others } = await db.from("order_refunds").select("steps").eq("order_id", o.id).neq("id", refundId);
      const taken = ((others ?? []) as { steps: RefundSteps }[]).reduce((n, x) => n + (x.steps?.points ?? 0), 0);
      const share = Math.round((earned * (r.card_pence + r.gift_pence)) / Math.max(1, o.total_pence + o.gift_card_pence));
      const pts = Math.max(0, Math.min(share, earned - taken));
      const ref = `refund-points-${refundId}`;
      if (pts > 0) {
        const { data: seen } = await db.from("reward_points").select("id").eq("ref", ref).maybeSingle();
        if (!seen) await awardPoints(db, { email: o.email, points: -pts, reason: "adjust", ref, note: `Refund of order ${o.number}` });
      }
      steps.points = pts;
    });
    if (!ok) allDone = false; else await save();
  }

  // 5. Tell the customer (a failed email is reported, not retried forever).
  if (!steps.emailed && o.email) {
    const sent = await sendEmail({ to: o.email, ...refundEmail({ number: o.number, name: o.name, cardPence: r.card_pence, giftPence: r.gift_pence, reason: r.reason }) });
    if (sent.ok) steps.emailed = true; else problems.add(`The refund email to ${o.email} failed: ${sent.error}`);
    await save();
  }

  if (!allDone) { await save(); return { ok: false, error: [...problems].join(" "), retry: true, refundId }; }

  // 6. Finished. A fully refunded order that has not shipped is cancelled.
  await save({ status: "done", error: "" });
  const { data: fresh } = await db.from("orders").select("*").eq("id", o.id).maybeSingle();
  const f = fresh as OrderRow;
  const fullyRefunded = (f.refunded_card_pence ?? 0) >= f.total_pence && (f.refunded_gift_pence ?? 0) >= f.gift_card_pence;
  if (f.status === "paid" && fullyRefunded) await db.from("orders").update({ status: "cancelled" }).eq("id", o.id);
  if (fullyRefunded && f.printify_order_id && f.status !== "shipped") await cancelAtPrintify(db, storeId, f);
  const { data: done } = await db.from("order_refunds").select("*").eq("id", refundId).maybeSingle();
  if (r.status !== "done") await emitEvent(db, "order.refunded", { order: publicOrder(f), refund: { id: refundId, card_pence: r.card_pence, gift_pence: r.gift_pence, reason: r.reason } });
  return { ok: true, refund: done as RefundRow, problems: [...problems] };
}

/**
 * Refunds made in the Stripe dashboard (or by anything else outside this admin) arrive by webhook. Record them against the order,
 * once each, so totals and revenue stay right. Refunds this admin started carry `spark_refund` metadata and are skipped.
 */
export async function recordExternalRefunds(db: Db, storeId: string, paymentIntent: string, refunds: { id: string; amount: number; status: string | null; metadata?: Record<string, string> | null }[]): Promise<number> {
  if (!paymentIntent) return 0;
  const { data } = await db.from("orders").select("*").eq("stripe_payment_intent", paymentIntent).maybeSingle();
  const o = data as OrderRow | null;
  if (!o) return 0;
  let recorded = 0;
  for (const re of refunds) {
    if (re.status !== "succeeded" || re.metadata?.spark_refund) continue;
    const { data: seen } = await db.from("order_refunds").select("id").eq("stripe_refund_id", re.id).maybeSingle();
    if (seen) continue;
    const { data: begun, error } = await db.rpc("begin_refund", { p_store: storeId, p_order: o.id, p_key: `stripe:${re.id}`, p_card: re.amount, p_gift: 0, p_reason: "Refunded in the Stripe dashboard", p_restock: [], p_points: false, p_by: "stripe", p_source: "stripe", p_stripe_id: re.id });
    if (error) throw new Error(error.message);
    const b = begun as { status: string; id?: string };
    if (b.status !== "created" || !b.id) continue;
    await db.from("order_refunds").update({ status: "done", steps: { stripe: true, external: true } }).eq("id", b.id);
    recorded++;
  }
  return recorded;
}

/**
 * A fully refunded order that Printify is making should not be printed and posted for free. Printify only lets us cancel an order that has not
 * gone to production yet, so if it refuses we say so on the order for the owner to cancel by hand (or contact Printify support).
 */
export async function cancelAtPrintify(db: Db, storeId: string, o: Pick<OrderRow, "id" | "number" | "printify_order_id" | "attention_reason">, api?: Pick<Printify, "cancelOrder">): Promise<"cancelled" | "refused" | "skipped"> {
  const sec = await getStoreSecrets(storeId);
  if (!o.printify_order_id || !sec.printifyShopId || (!api && !sec.printifyToken)) return "skipped";
  const note = (t: string) => db.from("orders").update({ attention_reason: [o.attention_reason, t].filter(Boolean).join("\n"), status: "attention", printify_status: "cancel-needed" }).eq("id", o.id);
  try {
    await (api ?? new Printify(sec.printifyToken)).cancelOrder(sec.printifyShopId, o.printify_order_id);
    await db.from("orders").update({ printify_status: "canceled" }).eq("id", o.id);
    return "cancelled";
  } catch (e) {
    const why = e instanceof PrintifyError && !e.retryable ? "Printify would not cancel it, most likely because it is already in production" : "Printify could not be reached to cancel it";
    await note(`Order ${o.number} was fully refunded but its Printify order (${o.printify_order_id}) is still active. ${why}. Cancel it in the Printify dashboard or contact Printify support so it is not printed and posted.`);
    return "refused";
  }
}
