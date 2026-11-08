"use server";

import { rateLimit, LIMITS, wait } from "@/lib/ratelimit";
import { currentStoreId } from "@/lib/db/stores";
import { publicClient } from "@/lib/db/clients";
import { normaliseCode, type CardStatus } from "@/lib/giftcards/format";

export type LookupResult =
  | { ok: true; code: string; balancePence: number; status: CardStatus; expiresAt: string | null }
  | { ok: false; error: string };

// Best-effort brake on code guessing. Codes have ~59 bits of entropy so guessing is impractical anyway;
// this just stops a single client hammering the endpoint. (Per server instance, in memory.)

export async function lookupGiftCardAction(input: string): Promise<LookupResult> {
  { const r = await rateLimit("giftLookup", LIMITS.giftLookup); if (!r.ok) return { ok: false, error: `Too many attempts. Please wait ${wait(r)} and try again.` }; }
  const code = normaliseCode(input);
  if (!code) return { ok: false, error: "That does not look like a gift card code. Check it against the email we sent you." };
  const db = publicClient();
  if (!db) return { ok: false, error: "Gift cards are not available yet." };
  const { data, error } = await db.rpc("gift_card_lookup", { p_code: code, p_store: await currentStoreId() });
  if (error) return { ok: false, error: "We could not check that right now. Please try again shortly." };
  const row = (data as { balance_pence: number; status: CardStatus; expires_at: string | null }[] | null)?.[0];
  if (!row) return { ok: false, error: "We could not find a gift card with that code. Check it and try again." };
  return { ok: true, code, balancePence: row.balance_pence, status: row.status, expiresAt: row.expires_at };
}
