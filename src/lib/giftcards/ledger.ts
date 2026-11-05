import type { Db } from "@/lib/db/clients";
import { generateCode } from "./code";

export type GiftCard = {
  id: string; code: string; initial_pence: number; balance_pence: number; currency: string; status: "active" | "disabled";
  recipient_name: string; recipient_email: string; sender_name: string; message: string; theme: string;
  source: "admin" | "purchase" | "promo"; order_ref: string; note: string; expires_at: string | null; emailed_at: string | null; created_at: string; updated_at: string;
};
export type LedgerEntry = { id: string; card_id: string; delta_pence: number; balance_after: number; kind: "issue" | "redeem" | "refund" | "adjust" | "void"; order_ref: string; note: string; created_by: string; created_at: string };

export type IssueInput = {
  amountPence: number; recipientName?: string; recipientEmail?: string; senderName?: string; message?: string; theme?: string;
  source?: GiftCard["source"]; orderRef?: string; note?: string; expiresAt?: string | null; createdBy?: string;
};

export const GIFT_LIMITS = { min: 500, max: 25000 };

/** Create a card and its opening ledger entry. Retries on the (astronomically unlikely) code collision. */
export async function issueCard(db: Db, i: IssueInput): Promise<GiftCard> {
  if (!Number.isInteger(i.amountPence) || i.amountPence < GIFT_LIMITS.min || i.amountPence > GIFT_LIMITS.max) throw new Error("The amount is outside the allowed range.");
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db.from("gift_cards").insert({
      code: generateCode(), currency: "GBP", initial_pence: i.amountPence, balance_pence: i.amountPence, status: "active",
      recipient_name: i.recipientName?.trim() ?? "", recipient_email: i.recipientEmail?.trim().toLowerCase() ?? "", sender_name: i.senderName?.trim() ?? "",
      message: i.message?.trim() ?? "", theme: i.theme ?? "bolt", source: i.source ?? "admin", order_ref: i.orderRef?.trim() ?? "", note: i.note?.trim() ?? "",
      expires_at: i.expiresAt || null,
    }).select("*").single();
    if (error) { if (/duplicate|unique/i.test(error.message)) continue; throw new Error(`Could not create the gift card: ${error.message}`); }
    const card = data as GiftCard;
    const led = await db.from("gift_card_ledger").insert({ card_id: card.id, delta_pence: card.initial_pence, balance_after: card.initial_pence, kind: "issue", order_ref: card.order_ref, note: i.note ?? "", created_by: i.createdBy ?? "" });
    if (led.error) throw new Error(`The card was created but its history entry failed: ${led.error.message}`);
    return card;
  }
  throw new Error("Could not generate a unique code. Try again.");
}

export async function getCard(db: Db, id: string): Promise<GiftCard | null> {
  const { data } = await db.from("gift_cards").select("*").eq("id", id).maybeSingle();
  return (data as GiftCard | null) ?? null;
}
export async function getCardByCode(db: Db, code: string): Promise<GiftCard | null> {
  const { data } = await db.from("gift_cards").select("*").eq("code", code).maybeSingle();
  return (data as GiftCard | null) ?? null;
}
export async function listCards(db: Db): Promise<GiftCard[]> {
  const { data, error } = await db.from("gift_cards").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GiftCard[];
}
export async function listLedger(db: Db, cardId: string): Promise<LedgerEntry[]> {
  const { data } = await db.from("gift_card_ledger").select("*").eq("card_id", cardId).order("created_at", { ascending: false });
  return (data ?? []) as LedgerEntry[];
}

export { effectiveStatus } from "./format";
import { effectiveStatus } from "./format";

/**
 * Move money on a card. delta < 0 spends (redeem/void/adjust), delta > 0 adds (refund/adjust).
 * Uses an optimistic check on the old balance so two simultaneous spends cannot both succeed.
 * Checkout code (and a payment webhook) should call this with kind "redeem" and the order reference.
 */
export async function changeBalance(db: Db, cardId: string, delta: number, kind: LedgerEntry["kind"], opts: { orderRef?: string; note?: string; createdBy?: string } = {}) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Enter an amount.");
  const card = await getCard(db, cardId);
  if (!card) throw new Error("Gift card not found.");
  if (kind === "redeem") {
    const s = effectiveStatus(card);
    if (s === "disabled") throw new Error("This card is disabled.");
    if (s === "expired") throw new Error("This card has expired.");
  }
  const next = card.balance_pence + delta;
  if (next < 0) throw new Error(`Not enough balance. The card has ${(card.balance_pence / 100).toFixed(2)} left.`);
  const { data, error } = await db.from("gift_cards").update({ balance_pence: next }).eq("id", cardId).eq("balance_pence", card.balance_pence).select("id");
  if (error) throw new Error(error.message);
  if (!data || (data as unknown[]).length === 0) throw new Error("The balance changed while you were working. Reload and try again.");
  const led = await db.from("gift_card_ledger").insert({ card_id: cardId, delta_pence: delta, balance_after: next, kind, order_ref: opts.orderRef?.trim() ?? "", note: opts.note?.trim() ?? "", created_by: opts.createdBy ?? "" });
  if (led.error) throw new Error(`Balance updated but the history entry failed: ${led.error.message}`);
  return next;
}

export async function setCardStatus(db: Db, cardId: string, status: GiftCard["status"], createdBy: string, note: string) {
  const { error } = await db.from("gift_cards").update({ status }).eq("id", cardId);
  if (error) throw new Error(error.message);
  const card = await getCard(db, cardId);
  await db.from("gift_card_ledger").insert({ card_id: cardId, delta_pence: 0, balance_after: card?.balance_pence ?? 0, kind: "void", note: `${status === "disabled" ? "Disabled" : "Re-enabled"}${note ? `: ${note}` : ""}`, created_by: createdBy });
}
