"use server";

import { headers } from "next/headers";
import { publicClient } from "@/lib/db/clients";
import { normaliseCode, type CardStatus } from "@/lib/giftcards/format";

export type LookupResult =
  | { ok: true; code: string; balancePence: number; status: CardStatus; expiresAt: string | null }
  | { ok: false; error: string };

// Best-effort brake on code guessing. Codes have ~59 bits of entropy so guessing is impractical anyway;
// this just stops a single client hammering the endpoint. (Per server instance, in memory.)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 10;
}

export async function lookupGiftCardAction(input: string): Promise<LookupResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (limited(ip)) return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  const code = normaliseCode(input);
  if (!code) return { ok: false, error: "That does not look like a gift card code. It starts with SPK and has 12 more characters." };
  const db = publicClient();
  if (!db) return { ok: false, error: "Gift cards are not available yet." };
  const { data, error } = await db.rpc("gift_card_lookup", { p_code: code });
  if (error) return { ok: false, error: "We could not check that right now. Please try again shortly." };
  const row = (data as { balance_pence: number; status: CardStatus; expires_at: string | null }[] | null)?.[0];
  if (!row) return { ok: false, error: "We could not find a gift card with that code. Check it and try again." };
  return { ok: true, code, balancePence: row.balance_pence, status: row.status, expiresAt: row.expires_at };
}
