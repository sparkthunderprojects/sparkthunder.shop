"use server";

import { revalidatePath } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";

type Result = { ok: true } | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export type PromotionInput = {
  name: string; kind: "percent" | "buy_x_get_y" | "free_shipping"; value: number; buyQty: number; getQty: number; minSpendPence: number;
  franchiseSlug: string; categorySlug: string; stacks: boolean; startsAt: string; expiresAt: string;
};

export async function createPromotionAction(i: PromotionInput): Promise<Result> {
  try {
    const { db } = await requireAdminAction("marketing");
    const name = i.name.trim().slice(0, 60);
    if (!name) return { ok: false, error: "Give the offer a name customers will see, e.g. \"Buy 2 get 1 free\"." };
    const value = Math.round(i.value), buy = Math.round(i.buyQty), get = Math.round(i.getQty);
    if (i.kind === "percent" && !(value >= 1 && value <= 100)) return { ok: false, error: "Percent off must be between 1 and 100." };
    if (i.kind === "buy_x_get_y") {
      if (!(buy >= 1 && buy <= 20 && get >= 1 && get <= 20)) return { ok: false, error: "Enter how many to buy and how many they get (1 to 20)." };
      if (!(value >= 1 && value <= 100)) return { ok: false, error: "The discount on the extra items must be between 1 and 100 percent (100 = free)." };
    }
    if (i.startsAt && Number.isNaN(Date.parse(i.startsAt))) return { ok: false, error: "Enter a valid start date or leave it empty." };
    if (i.expiresAt && Number.isNaN(Date.parse(i.expiresAt))) return { ok: false, error: "Enter a valid end date or leave it empty." };
    const { error } = await db.from("promotions").insert({
      name, kind: i.kind, value: i.kind === "free_shipping" ? 0 : value, buy_qty: i.kind === "buy_x_get_y" ? buy : 0, get_qty: i.kind === "buy_x_get_y" ? get : 0,
      min_spend_pence: Math.max(0, Math.round(i.minSpendPence) || 0), franchise_slug: i.franchiseSlug, category_slug: i.categorySlug, stacks_with_codes: i.stacks, active: true,
      starts_at: i.startsAt ? new Date(i.startsAt + "T00:00:00Z").toISOString() : null, expires_at: i.expiresAt ? new Date(i.expiresAt + "T23:59:59Z").toISOString() : null,
    });
    if (error) return { ok: false, error: `${error.message}. Run the latest supabase/admin.sql.` };
    revalidatePath("/admin/promotions");
    await audit("promotion.create", `Created automatic offer "${name}"`, { type: "promotion" });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function setPromotionActiveAction(id: string, active: boolean): Promise<Result> {
  try {
    const { db } = await requireAdminAction("marketing");
    const { error } = await db.from("promotions").update({ active }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/promotions");
    await audit("promotion.toggle", `${active ? "Turned on" : "Turned off"} an automatic offer`, { type: "promotion", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function deletePromotionAction(id: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction("marketing");
    const { error } = await db.from("promotions").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/promotions");
    await audit("promotion.delete", "Deleted an automatic offer", { type: "promotion", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
