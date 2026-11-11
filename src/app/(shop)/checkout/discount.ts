"use server";

import { rateLimit, LIMITS, wait } from "@/lib/ratelimit";
import { getAllProducts } from "@/lib/catalog";
import { publicOrServiceDb } from "@/lib/discount-db";
import { checkDiscount, describeDiscount, normaliseDiscountCode } from "@/lib/discounts";
import type { CartInput } from "@/lib/shop/types";
import { getCommerce } from "@/lib/commerce";
import { weightOf } from "@/lib/commerce-config";
import { bestPromotions, loadPromotions } from "@/lib/promotions";

export type QuoteResult = { ok: true; code: string; amountPence: number; label: string } | { ok: false; error: string };

// Brake on code guessing: 20 checks a minute per client (per server instance, in memory).

/** Tells the basket what a code would take off right now. The real check is repeated at checkout. */
export async function quoteDiscountAction(cart: CartInput, rawCode: string): Promise<QuoteResult> {
  { const r = await rateLimit("discount", LIMITS.discount); if (!r.ok) return { ok: false, error: `Too many attempts. Please wait ${wait(r)} and try again.` }; }
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

export type OffersQuote = { promo: { name: string; amountPence: number; stacks: boolean } | null; freeShippingBy: string | null; /** What the basket weighs, for delivery priced by weight. */ grams: number };

/** The automatic offers a basket qualifies for right now (the same rule checkout uses, so the basket never promises something checkout will not give). */
export async function quoteOffersAction(cart: CartInput): Promise<OffersQuote> {
  const db = publicOrServiceDb();
  if (!db) return { promo: null, freeShippingBy: null, grams: 0 };
  const catalogue = new Map((await getAllProducts()).map((p) => [p.slug, p]));
  const lines = cart.flatMap((i) => {
    const p = catalogue.get(String(i.slug).split("::")[0]);
    if (!p) return [];
    const v = String(i.slug).split("::")[1];
    const unit = (p.variants ?? []).find((x) => x.name === v)?.pricePence ?? p.pricePence;
    return [{ franchiseSlug: p.franchiseSlug, categorySlug: p.categorySlug, unitPence: unit, qty: Math.min(20, Math.max(1, Math.floor(Number(i.qty) || 1))) }];
  });
  const r = bestPromotions(await loadPromotions(db), lines);
  const weights = (await getCommerce()).weights;
  const grams = cart.reduce((n, i) => { const p = catalogue.get(String(i.slug).split("::")[0]); return p ? n + weightOf(weights, p.slug, p.categorySlug) * Math.min(20, Math.max(1, Math.floor(Number(i.qty) || 1))) : n; }, 0);
  return { promo: r.promo ? { name: r.promo.name, amountPence: r.promo.amountPence, stacks: r.promo.stacks } : null, freeShippingBy: r.freeShipping?.name ?? null, grams };
}
