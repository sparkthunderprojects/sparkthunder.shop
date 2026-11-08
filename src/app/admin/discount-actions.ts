"use server";

import { logActivity as audit } from "@/lib/admin/activity";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { normaliseDiscountCode } from "@/lib/discounts";

type Result = { ok: true } | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export type DiscountInput = {
  code: string; kind: "percent" | "fixed"; value: number; minSpendPence: number; maxUses: number | null;
  franchiseSlug: string; startsAt: string; expiresAt: string; note: string;
};

export async function createDiscountAction(i: DiscountInput): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const code = normaliseDiscountCode(i.code);
    if (code.length < 3) return { ok: false, error: "Codes need at least 3 letters or numbers (spaces and dashes are ignored)." };
    const value = Math.round(i.value);
    if (!Number.isFinite(value) || value < 1) return { ok: false, error: "Enter how much the code takes off." };
    if (i.kind === "percent" && value > 100) return { ok: false, error: "A percentage cannot be more than 100." };
    if (i.startsAt && Number.isNaN(Date.parse(i.startsAt))) return { ok: false, error: "Enter a valid start date or leave it empty." };
    if (i.expiresAt && Number.isNaN(Date.parse(i.expiresAt))) return { ok: false, error: "Enter a valid end date or leave it empty." };
    const dup = await db.from("discount_codes").select("id").eq("code", code).maybeSingle();
    if (dup.data) return { ok: false, error: "A code with that name already exists." };
    const { error } = await db.from("discount_codes").insert({
      code, kind: i.kind, value, min_spend_pence: Math.max(0, Math.round(i.minSpendPence) || 0), max_uses: i.maxUses && i.maxUses > 0 ? Math.floor(i.maxUses) : null, uses: 0,
      franchise_slug: i.franchiseSlug, starts_at: i.startsAt ? new Date(i.startsAt + "T00:00:00Z").toISOString() : null,
      expires_at: i.expiresAt ? new Date(i.expiresAt + "T23:59:59Z").toISOString() : null, active: true, note: i.note.trim(), created_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/discounts");
    await audit("discount.create", `Created discount code ${i.code}`, { type: "discount" });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function setDiscountActiveAction(id: string, active: boolean): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { error } = await db.from("discount_codes").update({ active }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/discounts");
    await audit("discount.toggle", `${active ? "Enabled" : "Disabled"} discount code`, { type: "discount", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

/** Codes that have been used are kept for the record (turn them off instead). */
export async function deleteDiscountAction(id: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { data } = await db.from("discount_codes").select("uses").eq("id", id).maybeSingle();
    if ((data as { uses: number } | null)?.uses) return { ok: false, error: "This code has been used, so it is kept for your records. Turn it off instead." };
    const { error } = await db.from("discount_codes").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/discounts");
    await audit("discount.delete", "Deleted a discount code", { type: "discount", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
