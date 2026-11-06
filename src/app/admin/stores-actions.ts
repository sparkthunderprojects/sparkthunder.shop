"use server";

import { cookies } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdminAction, requireOwnerAction } from "@/lib/admin/auth";
import { ADMIN_STORE_COOKIE, listStores } from "@/lib/db/stores";
import { serviceClient } from "@/lib/db/clients";

/** Pick which store the admin is editing. Stored in a cookie that only the admin area reads. */
export async function switchStoreAction(id: string): Promise<void> {
  const admin = await requireAdminAction();
  if (!(await listStores()).some((s) => s.id === id)) return;
  if (admin.access !== "*" && !admin.access.includes(id)) return;
  (await cookies()).set(ADMIN_STORE_COOKIE, id, { path: "/admin", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/admin", "layout");
}

const cleanDomains = (raw: string) =>
  [...new Set(raw.split(/[\s,]+/).map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")).filter(Boolean))];

export async function saveStoreRecordAction(input: { id: string; name: string; domains: string; create?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { db } = await requireOwnerAction();
    const id = input.id.trim().toLowerCase();
    const name = input.name.trim();
    const domains = cleanDomains(input.domains);
    if (!/^[a-z0-9-]{2,40}$/.test(id)) return { ok: false, error: "The store ID needs 2 to 40 letters, numbers or dashes." };
    if (!name) return { ok: false, error: "Give the store a name." };
    const taken = (await listStores()).find((s) => s.id !== id && s.domains.some((d) => domains.includes(d)));
    if (taken) return { ok: false, error: `That domain already belongs to ${taken.name}.` };
    const { error } = input.create
      ? await db.from("stores").insert({ id, name, domains, is_default: false })
      : await db.from("stores").update({ name, domains }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    updateTag("stores");
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

export async function setStaffAction(input: { email: string; storeId: string; add: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { db } = await requireOwnerAction();
    const email = input.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter the person's email address." };
    const { error } = await db.rpc("set_store_staff", { p_email: email, p_store: input.storeId, p_add: input.add });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

/**
 * Start a new store as a copy of an existing one: its design, shipping rules and (optionally) categories and franchises.
 * Products, orders, customers and credentials are never copied.
 */
export async function cloneStoreAction(input: { fromId: string; id: string; name: string; domains: string; copyTaxonomy: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOwnerAction();
    const made = await saveStoreRecordAction({ id: input.id, name: input.name, domains: input.domains, create: true });
    if (!made.ok) return made;
    const to = input.id.trim().toLowerCase();
    const from = serviceClient(input.fromId), dest = serviceClient(to);
    if (!from || !dest) return { ok: false, error: "The database is not configured." };
    const { data: settings } = await from.from("settings").select("key,value").in("key", ["store", "site", "commerce"]);
    for (const s of (settings ?? []) as { key: string; value: Record<string, unknown> }[]) {
      // The copy starts under its own name and domain, not the original's.
      const value = s.key === "store" ? { ...s.value, name: input.name.trim(), legalName: input.name.trim() } : s.key === "site" ? { ...s.value, sameAs: [], googleVerification: "", bingVerification: "" } : s.value;
      await dest.from("settings").upsert({ key: s.key, value }, { onConflict: "key" });
    }
    if (input.copyTaxonomy) {
      for (const table of ["franchises", "categories"] as const) {
        const { data } = await from.from(table).select("*");
        const rows = ((data ?? []) as Record<string, unknown>[]).map(({ store_id: _s, updated_at: _u, ...r }) => r);
        if (rows.length) await dest.from(table).insert(rows);
      }
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
