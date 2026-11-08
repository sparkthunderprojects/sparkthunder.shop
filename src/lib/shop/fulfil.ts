import { getCommerce } from "@/lib/commerce";
import { awardPoints, pointsForOrder } from "@/lib/rewards";
import type { Db } from "@/lib/db/clients";
import { giftCardEmail, orderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { recordDiscountUse } from "@/lib/discounts";
import { changeBalance, issueCard } from "@/lib/giftcards/ledger";
import type { Snapshot } from "./types";
import { releaseStock, stockItems } from "./stock";

/** Which fulfilment steps have been completed for an order. Saved after every step so a crash can be picked up where it stopped. */
export type FulfilState = { discount?: boolean; giftCardCharged?: boolean; issued?: string[]; stock?: string[]; points?: boolean; emailed?: boolean; problems?: string[] };

export type OrderRow = {
  id: string; number: string; stripe_session_id: string | null; stripe_payment_intent: string; status: "paid" | "shipped" | "cancelled" | "attention";
  email: string; name: string; phone: string; shipping_address: Record<string, string> | null; items: Snapshot["lines"];
  subtotal_pence: number; shipping_pence: number; discount_code?: string; discount_pence?: number; gift_card_pence: number; total_pence: number; gift_card_code: string; gift_message?: string; gift_wrap?: boolean; gift_wrap_pence?: number;
  refunded_card_pence?: number; refunded_gift_pence?: number;
  fulfilment?: FulfilState; fulfil_attempts?: number; fulfilment_lock_until?: string | null; fulfilled_at?: string | null;
  tracking_carrier: string; tracking_number: string; notes: string; attention_reason: string; shipped_at: string | null; created_at: string;
};
export type PaidSession = { storeId?: string; sessionId: string; paymentIntent: string; email: string; name: string; phone: string; address: Record<string, string> | null };

const LOCK_MS = 2 * 60_000;        // one worker finishes an order at a time; the lock frees itself if that worker dies
const MAX_ATTEMPTS = 6;            // after this many tries a step that keeps failing is reported to the owner instead of retried
const DEFAULT_STORE = "sparkthunder";

/** A failure we expect and report to the owner (not worth retrying). Anything else is treated as temporary and retried. */
class Business extends Error {}

async function nextNumber(db: Db, storeId: string): Promise<string> {
  const prefix = (await getCommerce()).codePrefix;
  const { data, error } = await db.rpc("next_order_number", { p_store: storeId });
  if (error) throw new Error(`Could not allocate an order number: ${error.message}. Run the latest supabase/admin.sql.`);
  return `${prefix}-${data}`;
}

async function createOrder(db: Db, s: PaidSession, storeId: string, payload: Snapshot | null): Promise<OrderRow> {
  // Create the order first so there is always a record of money taken, whatever happens next.
  for (let i = 0; i < 5; i++) {
    const number = await nextNumber(db, storeId);
    const ins = await db.from("orders").insert({
      number, stripe_session_id: s.sessionId, stripe_payment_intent: s.paymentIntent, status: "paid", email: s.email, name: s.name, phone: s.phone,
      shipping_address: s.address, items: payload?.lines ?? [], subtotal_pence: payload?.subtotalPence ?? 0, shipping_pence: payload?.shippingPence ?? 0,
      discount_code: payload?.discount?.code ?? "", discount_pence: payload?.discount?.appliedPence ?? 0,
      gift_message: payload?.giftOptions?.message ?? "", gift_wrap: payload?.giftOptions?.wrap ?? false, gift_wrap_pence: payload?.giftOptions?.wrapPence ?? 0,
      gift_card_pence: payload?.giftCard?.appliedPence ?? 0, total_pence: payload?.totalPence ?? 0, gift_card_code: payload?.giftCard?.code ?? "",
    }).select("*").single();
    if (!ins.error) return ins.data as OrderRow;
    if (/duplicate|unique/i.test(ins.error.message)) {
      const again = await db.from("orders").select("*").eq("stripe_session_id", s.sessionId).maybeSingle();
      if (again.data) return again.data as OrderRow; // a concurrent webhook created it first
      continue;
    }
    throw new Error(`Could not save the order: ${ins.error.message}`);
  }
  throw new Error("Could not allocate an order number.");
}

const businessGiftCardError = (m: string) => /not enough balance|disabled|expired|not found/i.test(m);

/**
 * Turn a paid Checkout Session into a finished order. Safe to call any number of times for the same session
 * (Stripe retries webhooks, and a worker can die half way): it never repeats a step that is done, never lets two
 * workers run at once, and picks up the unfinished steps. Temporary failures throw so the caller can ask Stripe to retry.
 * `busy` means another worker is on it right now.
 */
export async function fulfilOrder(db: Db, s: PaidSession): Promise<{ order: OrderRow; created: boolean; busy?: boolean }> {
  const storeId = s.storeId ?? DEFAULT_STORE;
  const snap = await db.from("checkout_snapshots").select("*").eq("id", s.sessionId).maybeSingle();
  const payload = (snap.data as { payload: Snapshot } | null)?.payload ?? null;

  let order = (await db.from("orders").select("*").eq("stripe_session_id", s.sessionId).maybeSingle()).data as OrderRow | null;
  const created = !order;
  if (!order) order = await createOrder(db, s, storeId, payload);
  if (order.fulfilled_at) return { order, created: false };

  // Claim the order: only one worker wins, and the claim expires so a dead worker never blocks the order forever.
  const now = Date.now(), attempts = order.fulfil_attempts ?? 0;
  if (order.fulfilment_lock_until && Date.parse(order.fulfilment_lock_until) > now) return { order, created, busy: true };
  const claim = await db.from("orders").update({ fulfil_attempts: attempts + 1, fulfilment_lock_until: new Date(now + LOCK_MS).toISOString() })
    .eq("id", order.id).eq("fulfil_attempts", attempts).select("*");
  const claimed = ((claim.data ?? []) as OrderRow[])[0];
  if (!claimed) return { order, created, busy: true };
  order = claimed;
  const orderId = order.id, number = order.number;

  const state: FulfilState = { ...(order.fulfilment ?? {}) };
  const problems = new Set(state.problems ?? []);
  const giveUp = attempts + 1 >= MAX_ATTEMPTS;
  const save = async () => {
    const { error } = await db.from("orders").update({ fulfilment: { ...state, problems: [...problems] } }).eq("id", orderId);
    if (error) throw new Error(`Could not save fulfilment progress: ${error.message}`);
  };
  /** Run one step. A reportable failure goes on the order's problem list; a temporary one is retried, until we give up and report it. */
  const attempt = async (label: string, fn: () => Promise<void>): Promise<boolean> => {
    try { await fn(); return true; }
    catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      if (e instanceof Business) { problems.add(msg); return true; }
      if (giveUp) { problems.add(`${label} could not be completed after ${MAX_ATTEMPTS} tries (${msg}).`); return true; }
      throw e;
    }
  };

  try {
    if (!payload) {
      problems.add("Payment received but the basket snapshot was missing. Check the Stripe payment and fulfil manually.");
    } else {
      // 0. Count the discount code use. The database counts it once per order, so repeating this step is safe.
      if (payload.discount && !state.discount) {
        if (await attempt("Counting the discount code", async () => {
          const r = await recordDiscountUse(db, storeId, orderId, payload.discount!.id);
          if (r.status === "missing") throw new Business(`Discount code ${payload.discount!.code} no longer exists, so its use was not counted.`);
          if (r.over) problems.add(`Discount code ${payload.discount!.code} went over its use limit (several customers used it at once). The order was honoured.`);
        })) { state.discount = true; await save(); }
      }

      // 1. Charge the gift card the customer used. Repeating this checks the card's history first, so it is never charged twice.
      if (payload.giftCard && !state.giftCardCharged) {
        const gc = payload.giftCard;
        if (await attempt("Charging the gift card", async () => {
          const done = await db.from("gift_card_ledger").select("id").eq("card_id", gc.cardId).eq("kind", "redeem").eq("order_ref", number).maybeSingle();
          if (!done.data) {
            for (let i = 0; ; i++) {
              try { await changeBalance(db, gc.cardId, -gc.appliedPence, "redeem", { orderRef: number, note: "Used at checkout", createdBy: "checkout" }); break; }
              catch (e) {
                const m = e instanceof Error ? e.message : "error";
                if (/balance changed/i.test(m) && i < 3) continue; // someone else changed the balance at the same moment: look again
                if (businessGiftCardError(m)) throw new Business(`Gift card ${gc.code} could not be charged (${m}) The customer was already discounted.`);
                throw e;
              }
            }
          }
        })) { state.giftCardCharged = true; await save(); }
      }

      // 2. Issue purchased gift cards and email them. Each copy has its own key, so a repeat finds the card instead of making another.
      const issued = new Set(state.issued ?? []);
      for (const [li, line] of payload.lines.entries()) {
        if (line.type !== "gift") continue;
        for (let n = 0; n < line.qty; n++) {
          const key = `${orderId}:${li}:${n}`;
          if (issued.has(key)) continue;
          if (await attempt("Creating a purchased gift card", async () => {
            const card = await issueCard(db, { amountPence: line.unitPence, ...line.gift, source: "purchase", orderRef: number, note: `Bought by ${s.email}`, createdBy: "checkout", fulfilKey: key });
            if (!card.emailed_at) {
              const sent = await sendEmail({ to: line.gift.recipientEmail, ...giftCardEmail(card, (await getCommerce()).codePrefix) });
              if (sent.ok) await db.from("gift_cards").update({ emailed_at: new Date().toISOString() }).eq("id", card.id);
              else problems.add(`Gift card ${card.code} was created but the email to ${line.gift.recipientEmail} failed: ${sent.error}. Resend it from Admin > Gift cards.`);
            }
          })) { issued.add(key); state.issued = [...issued]; await save(); }
        }
      }

      // 3. Take tracked stock off, atomically and exactly once per product (a bundle takes stock off every product inside it).
      const taken = new Set(state.stock ?? []);
      for (const it of await stockItems(db, payload.lines)) {
        if (taken.has(it.key)) continue;
        if (await attempt(`Taking stock off ${it.label}`, async () => {
          const { data, error } = await db.rpc("take_stock", { p_store: storeId, p_order: orderId, p_slug: it.slug, p_variant: it.variant, p_qty: it.qty });
          if (error) throw new Error(error.message);
          const before = Number(data);
          if (before >= 0 && before < it.qty) problems.add(`${it.label} oversold: ${it.qty} bought, ${before} were in stock.`);
        })) { taken.add(it.key); state.stock = [...taken]; await save(); }
      }

      // The stock is now counted off for real, so the checkout's hold is no longer needed.
      await releaseStock(db, storeId, payload.reservation);

      // 4. Spark points for signed-up customers (matched by email, so it works whether or not they were logged in at checkout).
      if (s.email && !state.points) {
        if (await attempt("Adding Spark points", async () => { await awardPoints(db, { email: s.email, points: pointsForOrder(payload), reason: "order", ref: number, note: `Order ${number}` }); })) { state.points = true; await save(); }
      }

      // 5. Confirmation email.
      if (!state.emailed) {
        const mail = orderEmail({ number, name: s.name, lines: payload.lines, subtotalPence: payload.subtotalPence, shippingPence: payload.shippingPence, discountPence: payload.discount?.appliedPence ?? 0, discountCode: payload.discount?.code ?? "", giftWrapPence: payload.giftOptions?.wrapPence ?? 0, giftMessage: payload.giftOptions?.message ?? "", giftCardPence: payload.giftCard?.appliedPence ?? 0, totalPence: payload.totalPence, address: s.address, giftCardsIssued: issued.size });
        const sent = s.email ? await sendEmail({ to: s.email, ...mail }) : { ok: false as const, error: "no email address" };
        if (sent.ok) state.emailed = true; else problems.add(`Order confirmation email not sent: ${sent.error}`);
      }
      await db.from("checkout_snapshots").update({ fulfilled_at: new Date().toISOString() }).eq("id", s.sessionId);
    }

    const list = [...problems];
    const status = list.some((p) => !p.startsWith("Order confirmation email")) ? "attention" : "paid";
    const done = { fulfilled_at: new Date().toISOString(), fulfilment_lock_until: null, fulfilment: { ...state, problems: list }, ...(list.length ? { attention_reason: list.join("\n"), status } : {}) };
    const fin = await db.from("orders").update(done).eq("id", orderId);
    if (fin.error) throw new Error(`Could not finish the order: ${fin.error.message}`);
    return { order: { ...order, ...done, fulfilment: done.fulfilment } as OrderRow, created };
  } catch (e) {
    await db.from("orders").update({ fulfilment_lock_until: null }).eq("id", orderId); // let the retry start straight away
    throw e;
  }
}
