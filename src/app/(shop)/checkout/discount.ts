"use server";

import { headers } from "next/headers";
import { getAllProducts } from "@/lib/catalog";
import { publicOrServiceDb } from "@/lib/discount-db";
import { checkDiscount, describeDiscount, normaliseDiscountCode } from "@/lib/discounts";
import type { CartInput } from "@/lib/shop/types";

export type QuoteResult = { ok: true; code: string; amountPence: number; label: string } | { ok: false; error: string };

// Brake on code guessing: 20 checks a minute per client (per server instance, in memory).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 20;
}

/** Tells the basket what a code would take off right now. The real check is repeated at checkout. */
export async function quoteDiscountAction(cart: CartInput, rawCode: string): Promise<QuoteResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (limited(ip)) return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  const code = normaliseDiscountCode(rawCode);
  if (!code) return { ok: false, error: "Enter a discount code." };
  const db = publicOrServiceDb();
  if (!db) return { ok: false, error: "Discount codes are not available yet." };
  const catalogue = new Map((await getAllProducts()).map((p) => [p.slug, p]));
  const lines = cart.flatMap((i) => {
    const p = catalogue.get(String(i.slug).split("::")[0]);
    return p ? [{ franchiseSlug: p.franchiseSlug, totalPence: p.pricePence * Math.min(20, Math.max(1, Math.floor(Number(i.qty) || 1))) }] : [];
  });
  const check = await checkDiscount(db, code, lines);
  if (!check.ok) return check;
  return { ok: true, code: check.row.code, amountPence: check.amountPence, label: describeDiscount(check.row) };
}
