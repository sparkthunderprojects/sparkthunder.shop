"use server";

import { cookies } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { ADMIN_STORE_COOKIE, listStores } from "@/lib/db/stores";

/** Pick which store the admin is editing. Stored in a cookie that only the admin area reads. */
export async function switchStoreAction(id: string): Promise<void> {
  await requireAdminAction();
  if (!(await listStores()).some((s) => s.id === id)) return;
  (await cookies()).set(ADMIN_STORE_COOKIE, id, { path: "/admin", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/admin", "layout");
}

const cleanDomains = (raw: string) =>
  [...new Set(raw.split(/[\s,]+/).map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")).filter(Boolean))];

export async function saveStoreRecordAction(input: { id: string; name: string; domains: string; create?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { db } = await requireAdminAction();
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
