import type { Db } from "@/lib/db/clients";
import { formatPrice } from "@/lib/site";

/** An automatic offer: applies by itself when the basket qualifies, no code needed. */
export type PromotionRow = {
  id: string; name: string; kind: "percent" | "buy_x_get_y" | "free_shipping";
  /** percent: % off the eligible goods. buy_x_get_y: % off the "get" items (100 = free). */
  value: number; buy_qty: number; get_qty: number; min_spend_pence: number;
  franchise_slug: string; category_slug: string;
  /** If true, a discount code can be used on top. If false, the customer gets whichever is bigger. */
  stacks_with_codes: boolean;
  active: boolean; starts_at: string | null; expires_at: string | null; created_at?: string;
};

export type PromoLine = { franchiseSlug: string; categorySlug: string; unitPence: number; qty: number };
export type PromoResult = { promo: { id: string; name: string; amountPence: number; stacks: boolean } | null; freeShipping: { id: string; name: string } | null };

export const describePromotion = (p: Pick<PromotionRow, "kind" | "value" | "buy_qty" | "get_qty" | "min_spend_pence">) =>
  p.kind === "percent" ? `${p.value}% off${p.min_spend_pence ? ` when you spend ${formatPrice(p.min_spend_pence)}` : ""}`
  : p.kind === "buy_x_get_y" ? `Buy ${p.buy_qty}, get ${p.get_qty} ${p.value >= 100 ? "free" : `at ${p.value}% off`}`
  : `Free delivery${p.min_spend_pence ? ` over ${formatPrice(p.min_spend_pence)}` : ""}`;

const live = (p: PromotionRow, now: number) => p.active && (!p.starts_at || Date.parse(p.starts_at) <= now) && (!p.expires_at || Date.parse(p.expires_at) >= now);

/** What one promotion takes off these lines (0 if it does not apply). Pure, so the basket and checkout always agree. */
export function promotionAmount(p: PromotionRow, lines: PromoLine[]): number {
  const eligible = lines.filter((l) => (!p.franchise_slug || l.franchiseSlug === p.franchise_slug) && (!p.category_slug || l.categorySlug === p.category_slug));
  const total = eligible.reduce((n, l) => n + l.unitPence * l.qty, 0);
  if (total <= 0 || total < p.min_spend_pence) return 0;
  if (p.kind === "percent") return Math.floor((total * Math.min(100, Math.max(0, p.value))) / 100);
  if (p.kind === "buy_x_get_y") {
    const b = Math.max(1, p.buy_qty), g = Math.max(1, p.get_qty), pct = Math.min(100, Math.max(1, p.value));
    const units = eligible.flatMap((l) => Array<number>(l.qty).fill(l.unitPence)).sort((x, y) => y - x); // dearest first
    const groups = Math.floor(units.length / (b + g));
    let off = 0;
    for (let k = 0; k < groups; k++) for (const price of units.slice(k * (b + g) + b, (k + 1) * (b + g))) off += Math.floor((price * pct) / 100); // the cheapest in each group
    return off;
  }
  return 0;
}

/** The best automatic discount for a basket (only one product offer applies at a time) and whether delivery is free. */
export function bestPromotions(promos: PromotionRow[], lines: PromoLine[], now = Date.now()): PromoResult {
  let best: PromoResult["promo"] = null, free: PromoResult["freeShipping"] = null;
  for (const p of promos.filter((x) => live(x, now))) {
    if (p.kind === "free_shipping") {
      const eligible = lines.filter((l) => (!p.franchise_slug || l.franchiseSlug === p.franchise_slug) && (!p.category_slug || l.categorySlug === p.category_slug)).reduce((n, l) => n + l.unitPence * l.qty, 0);
      if (eligible > 0 && eligible >= p.min_spend_pence && !free) free = { id: p.id, name: p.name };
      continue;
    }
    const amountPence = promotionAmount(p, lines);
    if (amountPence > (best?.amountPence ?? 0)) best = { id: p.id, name: p.name, amountPence, stacks: p.stacks_with_codes };
  }
  return { promo: best, freeShipping: free };
}

export async function loadPromotions(db: Db): Promise<PromotionRow[]> {
  const { data } = await db.from("promotions").select("*").eq("active", true);
  return ((data ?? []) as PromotionRow[]);
}

/** All money taken off the goods by a code and an automatic offer together (for totals, VAT, points and the order record). */
export const moneyOff = (s: { discount?: { appliedPence: number } | null; promotion?: { appliedPence: number } | null }) => (s.discount?.appliedPence ?? 0) + (s.promotion?.appliedPence ?? 0);

/**
 * How an automatic offer and a discount code combine. If the offer stacks, both apply (the code never takes more than is left).
 * If it does not, the customer gets whichever is bigger. One rule, used by the basket and by checkout.
 */
export function combineOffers(promoPence: number, promoStacks: boolean, codePence: number, goodsPence: number): { promoPence: number; codePence: number } {
  if (promoPence <= 0) return { promoPence: 0, codePence: Math.min(codePence, goodsPence) };
  if (codePence <= 0) return { promoPence, codePence: 0 };
  if (promoStacks) return { promoPence, codePence: Math.min(codePence, Math.max(0, goodsPence - promoPence)) };
  return codePence > promoPence ? { promoPence: 0, codePence } : { promoPence, codePence: 0 };
}
