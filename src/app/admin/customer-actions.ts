"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { loadCustomers } from "@/lib/admin/customers-data";
import { cleanTags } from "@/lib/customers";

type Result = { ok: true } | { ok: false; error: string };

/** Saves the owner's private notes and tags for a customer. The customer is identified by their id (not their email) and must exist in this store. */
export async function saveCustomerNoteAction(id: string, tagsText: string, notes: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction("customers");
    const c = (await loadCustomers(db)).find((x) => x.id === id);
    if (!c) return { ok: false, error: "That customer was not found." };
    if (notes.length > 4000) return { ok: false, error: "Notes can be up to 4,000 characters." };
    const tags = cleanTags(tagsText);
    const { error } = await db.from("customer_notes").upsert({ email: c.email, tags, notes: notes.trim(), updated_at: new Date().toISOString() }, { onConflict: "email" });
    if (error) return { ok: false, error: `${error.message}. Run the latest supabase/admin.sql.` };
    revalidatePath("/admin/customers");
    await logActivity("customer.note", `Updated notes and tags for ${c.email}`, { type: "customer", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
