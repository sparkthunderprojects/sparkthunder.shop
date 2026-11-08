"use server";

import { getCommerce } from "@/lib/commerce";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { giftCardEmail, shippedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { getCard } from "@/lib/giftcards/ledger";
import { fulfilOrder, type OrderRow } from "@/lib/shop/fulfil";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";

type Result = { ok: true; note?: string } | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export async function markShippedAction(id: string, carrier = "", tracking = ""): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { data } = await db.from("orders").select("*").eq("id", id).maybeSingle();
    const o = data as OrderRow | null;
    if (!o) return { ok: false, error: "Order not found." };
    const { error } = await db.from("orders").update({ status: "shipped", tracking_carrier: carrier.trim(), tracking_number: tracking.trim(), shipped_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/admin/orders/${id}`); revalidatePath("/admin/orders");
    if (!o.email) return { ok: true, note: "Marked as shipped. There is no email address on this order." };
    const sent = await sendEmail({ to: o.email, ...shippedEmail({ number: o.number, name: o.name, carrier: carrier.trim(), tracking: tracking.trim() }) });
    return { ok: true, note: sent.ok ? "Marked as shipped and the customer was emailed." : `Marked as shipped, but the email failed: ${sent.error}` };
  } catch (e) { return { ok: false, error: message(e) }; }
}

/** Finish an order that stopped part way (stock, gift cards, points, email). Only the unfinished steps run. */
export async function finishOrderAction(id: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { data } = await db.from("orders").select("*").eq("id", id).maybeSingle();
    const o = data as OrderRow | null;
    if (!o) return { ok: false, error: "Order not found." };
    if (o.fulfilled_at) return { ok: true, note: "This order is already complete." };
    const svc = serviceClient();
    if (!svc) return { ok: false, error: "The database is not configured." };
    await svc.from("orders").update({ fulfil_attempts: 0, fulfilment_lock_until: null }).eq("id", id); // a fresh start: the owner is asking for it
    const r = await fulfilOrder(svc, { storeId: await currentStoreId(), sessionId: o.stripe_session_id ?? "", paymentIntent: o.stripe_payment_intent, email: o.email, name: o.name, phone: o.phone, address: o.shipping_address });
    revalidatePath(`/admin/orders/${id}`); revalidatePath("/admin/orders");
    if (r.busy) return { ok: false, error: "Another process is finishing this order right now. Try again in a minute." };
    return { ok: true, note: r.order.status === "attention" ? "Finished, but some steps need your attention." : "The order is complete." };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function updateOrderAction(id: string, patch: { status: OrderRow["status"]; notes: string }): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { error } = await db.from("orders").update({ status: patch.status, notes: patch.notes.trim(), ...(patch.status === "paid" ? { attention_reason: "" } : {}) }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/admin/orders/${id}`); revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

/** Email (or re-email) a gift card to its recipient. Also used for cards issued by hand in the admin. */
export async function emailGiftCardAction(id: string, toOverride?: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const card = await getCard(db, id);
    if (!card) return { ok: false, error: "Gift card not found." };
    const to = (toOverride || card.recipient_email).trim();
    if (!/^\S+@\S+\.\S+$/.test(to)) return { ok: false, error: "Add a valid recipient email first." };
    const sent = await sendEmail({ to, ...giftCardEmail(card, (await getCommerce()).codePrefix) });
    if (!sent.ok) return { ok: false, error: sent.error };
    await db.from("gift_cards").update({ emailed_at: new Date().toISOString() }).eq("id", id);
    revalidatePath(`/admin/gift-cards/${id}`);
    return { ok: true, note: `Emailed to ${to}.` };
  } catch (e) { return { ok: false, error: message(e) }; }
}
