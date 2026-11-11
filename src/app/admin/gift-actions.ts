"use server";

import { logActivity as audit } from "@/lib/admin/activity";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import * as gc from "@/lib/giftcards/ledger";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
const EMAIL = /^\S+@\S+\.\S+$/;

export async function issueGiftCardAction(input: gc.IssueInput): Promise<Result<{ id: string; code: string }>> {
  try {
    const { db, email } = await requireAdminAction("marketing");
    if (input.recipientEmail && !EMAIL.test(input.recipientEmail)) return { ok: false, error: "That recipient email does not look right." };
    if (input.expiresAt && Number.isNaN(Date.parse(input.expiresAt))) return { ok: false, error: "Enter a valid expiry date or leave it empty." };
    const card = await gc.issueCard(db, { ...input, expiresAt: input.expiresAt ? new Date(input.expiresAt + "T23:59:59Z").toISOString() : null, createdBy: email });
    revalidatePath("/admin/gift-cards"); revalidatePath("/admin");
    await audit("giftcard.issue", `Issued gift card ${card.code.slice(0, 4)}…`, { type: "giftcard", id: card.id });
    return { ok: true, id: card.id, code: card.code };
  } catch (e) { return { ok: false, error: message(e) }; }
}

/** kind "redeem" = take money off (e.g. a manual or phone order); "refund"/"adjust" can add or remove. */
export async function changeGiftCardBalanceAction(id: string, deltaPence: number, kind: "redeem" | "refund" | "adjust", orderRef: string, note: string): Promise<Result<{ balance: number }>> {
  try {
    const { db, email } = await requireAdminAction("marketing");
    if (kind === "adjust" && !note.trim()) return { ok: false, error: "Add a note explaining the adjustment." };
    const balance = await gc.changeBalance(db, id, kind === "redeem" ? -Math.abs(deltaPence) : kind === "refund" ? Math.abs(deltaPence) : deltaPence, kind, { orderRef, note, createdBy: email });
    revalidatePath(`/admin/gift-cards/${id}`); revalidatePath("/admin/gift-cards"); revalidatePath("/admin");
    await audit("giftcard.balance", `Gift card ${kind}: ${deltaPence} pence`, { type: "giftcard", id, meta: { kind, deltaPence, orderRef } });
    return { ok: true, balance };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function setGiftCardStatusAction(id: string, status: "active" | "disabled", note: string): Promise<Result> {
  try {
    const { db, email } = await requireAdminAction("marketing");
    await gc.setCardStatus(db, id, status, email, note);
    revalidatePath(`/admin/gift-cards/${id}`); revalidatePath("/admin/gift-cards"); revalidatePath("/admin");
    await audit("giftcard.status", `Gift card ${status}`, { type: "giftcard", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function updateGiftCardDetailsAction(id: string, d: { recipientName: string; recipientEmail: string; senderName: string; message: string; note: string; expiresAt: string }): Promise<Result> {
  try {
    const { db } = await requireAdminAction("marketing");
    if (d.recipientEmail && !EMAIL.test(d.recipientEmail)) return { ok: false, error: "That recipient email does not look right." };
    const { error } = await db.from("gift_cards").update({
      recipient_name: d.recipientName.trim(), recipient_email: d.recipientEmail.trim().toLowerCase(), sender_name: d.senderName.trim(), message: d.message.trim(), note: d.note.trim(),
      expires_at: d.expiresAt ? new Date(d.expiresAt + "T23:59:59Z").toISOString() : null,
    }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/admin/gift-cards/${id}`);
    await audit("giftcard.edit", "Edited gift card details", { type: "giftcard", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
