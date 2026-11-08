import type { Db } from "@/lib/db/clients";
import { formatPrice } from "@/lib/site";

export type DiscountRow = {
  id: string; code: string; kind: "percent" | "fixed"; value: number; min_spend_pence: number; max_uses: number | null; uses: number;
  franchise_slug: string; starts_at: string | null; expires_at: string | null; active: boolean; note: string; created_at: string;
};

/** Codes are typed by people: ignore case, spaces and dashes. */
export const normaliseDiscountCode = (s: string) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);

export const describeDiscount = (d: Pick<DiscountRow, "kind" | "value">) => (d.kind === "percent" ? `${d.value}% off` : `${formatPrice(d.value)} off`);

/** What a code takes off. `eligiblePence` is the product subtotal it applies to (gift cards and shipping never count). */
export const discountAmount = (d: Pick<DiscountRow, "kind" | "value">, eligiblePence: number) =>
  Math.max(0, Math.min(eligiblePence, d.kind === "percent" ? Math.floor((eligiblePence * Math.min(100, d.value)) / 100) : d.value));

export type DiscountCheck = { ok: true; row: DiscountRow; amountPence: number } | { ok: false; error: string };

/**
 * Validate a code against a basket. `lines` are the product lines (franchise + total pence each);
 * a universe-restricted code only counts lines from that universe.
 */
export async function checkDiscount(db: Db, rawCode: string, lines: { franchiseSlug: string; totalPence: number }[]): Promise<DiscountCheck> {
  const code = normaliseDiscountCode(rawCode);
  const bad = { ok: false as const, error: "That discount code is not valid." };
  if (!code) return bad;
  const { data } = await db.from("discount_codes").select("*").eq("code", code).maybeSingle();
  const d = data as DiscountRow | null;
  if (!d || !d.active) return bad;
  const now = Date.now();
  if (d.starts_at && Date.parse(d.starts_at) > now) return { ok: false, error: "That discount code is not active yet." };
  if (d.expires_at && Date.parse(d.expires_at) < now) return { ok: false, error: "That discount code has expired." };
  if (d.max_uses !== null && d.uses >= d.max_uses) return { ok: false, error: "That discount code has been fully used." };
  const eligible = lines.filter((l) => !d.franchise_slug || l.franchiseSlug === d.franchise_slug).reduce((n, l) => n + l.totalPence, 0);
  if (eligible <= 0) return { ok: false, error: d.franchise_slug ? "That code only applies to a specific universe's products, and none are in your basket." : "Add a product to use that code." };
  if (eligible < d.min_spend_pence) return { ok: false, error: `Spend ${formatPrice(d.min_spend_pence)} or more on eligible products to use that code.` };
  const amountPence = discountAmount(d, eligible);
  if (amountPence <= 0) return bad;
  return { ok: true, row: d, amountPence };
}

export type DiscountUse = { status: "counted" | "repeat" | "missing"; over?: boolean };

/** Count one use of a code for an order: exactly once per order, however often this is called (SQL `use_discount`). */
export async function recordDiscountUse(db: Db, storeId: string, orderId: string, codeId: string): Promise<DiscountUse> {
  const { data, error } = await db.rpc("use_discount", { p_store: storeId, p_order: orderId, p_code: codeId });
  if (error) throw new Error(error.message);
  return data as DiscountUse;
}
