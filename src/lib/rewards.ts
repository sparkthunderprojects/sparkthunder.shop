import type { Db } from "@/lib/db/clients";
import type { Snapshot } from "@/lib/shop/types";
import { normaliseDiscountCode } from "@/lib/discounts";

/** Spark points: earned with a Sparkthunder ID (matched by the email on the order), spent as single-use discount codes. */
export const POINTS_PER_POUND = 1;
export const REVIEW_BONUS = 25;
export const REDEEM_OPTIONS = [
  { points: 500, pence: 500 },
  { points: 1000, pence: 1200 },
  { points: 2000, pence: 2800 },
] as const;
export const CODE_VALID_DAYS = 90;

export type LedgerRow = { id: string; email: string; points: number; reason: "order" | "review" | "redeem" | "adjust"; ref: string; note: string; created_at: string };

/** Points for an order: whole pounds spent on products after any discount code (gift cards and shipping earn nothing). */
export function pointsForOrder(p: Pick<Snapshot, "lines" | "discount">): number {
  const spent = p.lines.reduce((n, l) => n + (l.type === "product" ? l.unitPence * l.qty : 0), 0) - (p.discount?.appliedPence ?? 0);
  return Math.max(0, Math.floor(spent / 100)) * POINTS_PER_POUND;
}

/** Adds (or removes) points once per reason+ref, so retries and webhook repeats never double count. */
export async function awardPoints(db: Db, a: { email: string; points: number; reason: LedgerRow["reason"]; ref: string; note?: string }): Promise<boolean> {
  const email = a.email.trim().toLowerCase();
  if (!email || !Number.isFinite(a.points) || a.points === 0) return false;
  if (a.reason !== "adjust") {
    const dup = await db.from("reward_points").select("id").eq("reason", a.reason).eq("ref", a.ref).maybeSingle();
    if (dup.data) return false;
  }
  const { error } = await db.from("reward_points").insert({ email, points: Math.round(a.points), reason: a.reason, ref: a.ref, note: a.note ?? "", created_at: new Date().toISOString() });
  return !error;
}

export async function ledgerFor(db: Db, email: string): Promise<LedgerRow[]> {
  const { data } = await db.from("reward_points").select("*").eq("email", email.toLowerCase()).order("created_at", { ascending: false });
  return (data ?? []) as LedgerRow[];
}
export const balanceOf = (rows: LedgerRow[]) => rows.reduce((n, r) => n + r.points, 0);

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `SPARK${s}`;
}

/** Trade points for a single-use discount code (service-role client). Points are taken first and given back if the code cannot be made. */
export async function redeemPoints(db: Db, email: string, optionIndex: number): Promise<{ ok: true; code: string; pence: number } | { ok: false; error: string }> {
  const opt = REDEEM_OPTIONS[optionIndex];
  if (!opt) return { ok: false, error: "That reward is not available." };
  const rows = await ledgerFor(db, email);
  if (balanceOf(rows) < opt.points) return { ok: false, error: "You do not have enough points for that yet." };
  const code = normaliseDiscountCode(randomCode());
  const ref = `${code}`;
  if (!(await awardPoints(db, { email, points: -opt.points, reason: "redeem", ref, note: `Redeemed for ${code}` }))) return { ok: false, error: "We could not take the points. Please try again." };
  const { error } = await db.from("discount_codes").insert({
    code, kind: "fixed", value: opt.pence, min_spend_pence: 0, max_uses: 1, uses: 0, franchise_slug: "", starts_at: null,
    expires_at: new Date(Date.now() + CODE_VALID_DAYS * 86400000).toISOString(), active: true, note: `Spark points reward for ${email}`, created_at: new Date().toISOString(),
  });
  if (error) {
    await db.from("reward_points").insert({ email: email.toLowerCase(), points: opt.points, reason: "adjust", ref: `refund-${code}`, note: "Refund: code could not be created", created_at: new Date().toISOString() });
    return { ok: false, error: "We could not create your code. Your points have been returned." };
  }
  return { ok: true, code, pence: opt.pence };
}
