"use server";

import { dbSetupProblem } from "@/lib/db/env";
import { logActivity as audit } from "@/lib/admin/activity";

import { cookies } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdminAction, requireOwnerAction } from "@/lib/admin/auth";
import { ADMIN_STORE_COOKIE, currentStoreId, listStores } from "@/lib/db/stores";
import { bustTag } from "@/lib/tags";
import { serviceClient } from "@/lib/db/clients";
import { isRole } from "@/lib/admin/roles";
import { starterById, starterSettings } from "@/lib/starters";

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
    await audit("store.record", `${input.create ? "Created" : "Updated"} store ${input.id}`, { type: "store", id: input.id });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

export async function setStaffAction(input: { email: string; storeId: string; add: boolean; role?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { db } = await requireOwnerAction();
    const email = input.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter the person's email address." };
    const role = isRole(input.role) ? input.role : "manager";
    const { error } = await db.rpc("set_store_staff", { p_email: email, p_store: input.storeId, p_add: input.add, p_role: role });
    if (error) return { ok: false, error: error.message };
    await audit("staff.change", `${input.add ? `Gave ${role} access to` : "Removed staff access for"} ${input.email} on store ${input.storeId}`, { type: "staff", id: input.storeId });
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
    if (!from || !dest) return { ok: false, error: dbSetupProblem() };
    const { data: settings } = await from.from("settings").select("key,value").in("key", ["store", "site", "commerce"]);
    for (const s of (settings ?? []) as { key: string; value: Record<string, unknown> }[]) {
      // The copy starts under its own name and domain, not the original's.
      const value = s.key === "store" ? { ...s.value, name: input.name.trim(), legalName: input.name.trim() } : s.key === "site" ? { ...s.value, sameAs: [], googleVerification: "", bingVerification: "" } : s.value;
      await dest.from("settings").upsert({ key: s.key, value }, { onConflict: "key" });
    }
    if (input.copyTaxonomy) {
      for (const table of ["franchises", "categories"] as const) {
        const { data } = await from.from(table).select("*");
        const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => { const o = { ...r }; delete o.store_id; delete o.updated_at; return o; });
        if (rows.length) await dest.from(table).insert(rows);
      }
    }
    await audit("store.clone", `Cloned store ${input.fromId} into ${input.id}`, { type: "store", id: input.id });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

/**
 * Create a new store from a ready-made template: its brand and layout, product lines, categories and empty, unpublished collections.
 * Never products, orders, customers or keys. The owner then adds products and photos.
 */
export async function createStarterStoreAction(input: { starter: string; id: string; name: string; domains: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOwnerAction();
    const st = starterById(input.starter);
    if (!st) return { ok: false, error: "Unknown template." };
    const id = (input.id.trim() || st.id).toLowerCase(), name = input.name.trim() || st.name;
    if ((await listStores()).some((x) => x.id === id)) return { ok: false, error: `A store with the ID ${id} already exists. Pick another ID.` };
    const made = await saveStoreRecordAction({ id, name, domains: input.domains, create: true });
    if (!made.ok) return made;
    const dest = serviceClient(id);
    if (!dest) return { ok: false, error: dbSetupProblem() };
    const { store, theme } = starterSettings(st, name);
    for (const [key, value] of [["store", store], ["theme", theme]] as const) {
      const { error } = await dest.from("settings").upsert({ key, value }, { onConflict: "key" });
      if (error) return { ok: false, error: `The store was created but its ${key} settings did not save: ${error.message}` };
    }
    const rows: [string, Record<string, unknown>[]][] = [
      ["franchises", st.franchises.map((f, i) => ({ ...f, sort_order: i + 1 }))],
      ["categories", st.categories.map((c, i) => ({ ...c, sort_order: i + 1 }))],
      ["collections", st.collections.map((c, i) => ({ ...c, image: "", launch_at: null, product_slugs: [], sort_order: i + 1, published: false }))],
    ];
    for (const [table, list] of rows) {
      if (!list.length) continue;
      const { error } = await dest.from(table).insert(list);
      if (error) return { ok: false, error: `The store was created but its ${table} did not save: ${error.message}` };
    }
    updateTag("stores");
    revalidatePath("/admin", "layout");
    await audit("store.starter", `Created store ${id} from the ${st.name} template`, { type: "store", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

/**
 * Re-applies a template's look and home page to the store being edited (for a store made from an older version of the template).
 * Replaces its colours, logo, fonts, layout, banners and home page; keeps its name, domains, products, orders and customers.
 */
export async function reapplyStarterLookAction(starterId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOwnerAction();
    const st = starterById(starterId);
    if (!st) return { ok: false, error: "Unknown template." };
    const id = await currentStoreId();
    const store0 = (await listStores()).find((x) => x.id === id);
    if (!store0) return { ok: false, error: "Pick the store to update first." };
    const dest = serviceClient(id);
    if (!dest) return { ok: false, error: dbSetupProblem() };
    const { store, theme } = starterSettings(st, store0.name);
    for (const [key, value] of [["store", store], ["theme", theme]] as const) {
      const { error } = await dest.from("settings").upsert({ key, value }, { onConflict: "key" });
      if (error) return { ok: false, error: `The ${key} settings did not save: ${error.message}` };
    }
    await bustTag("settings");
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    await audit("store.starter", `Re-applied the ${st.name} template look to ${id}`, { type: "store", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
