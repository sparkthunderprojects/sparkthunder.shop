"use server";

import { revalidatePath } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { normaliseStore, type StoreSettings } from "@/lib/store-config";
import { applyPreset, normaliseTheme, type ThemeLayout } from "@/lib/theme-config";
import { bustTag } from "@/lib/tags";

type Result = { ok: true } | { ok: false; error: string };

export async function saveThemeAction(input: ThemeLayout): Promise<Result> {
  try {
    const { db } = await requireAdminAction("settings");
    const { error } = await db.from("settings").upsert({ key: "theme", value: normaliseTheme(input) }, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
    await bustTag("settings"); revalidatePath("/", "layout");
    await audit("theme.save", "Saved theme layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

/** Sets colours, type, corners and layout together from a preset. The store's name, logo and wording are kept. */
export async function applyPresetAction(id: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction("settings");
    const [{ data: s }, { data: t }] = await Promise.all([db.from("settings").select("value").eq("key", "store").maybeSingle(), db.from("settings").select("value").eq("key", "theme").maybeSingle()]);
    const next = applyPreset(id, normaliseStore((s as { value?: Partial<StoreSettings> } | null)?.value), normaliseTheme((t as { value?: Partial<ThemeLayout> } | null)?.value));
    if (!next) return { ok: false, error: "Unknown preset." };
    const a = await db.from("settings").upsert({ key: "store", value: next.store }, { onConflict: "key" });
    if (a.error) return { ok: false, error: a.error.message };
    const b = await db.from("settings").upsert({ key: "theme", value: next.theme }, { onConflict: "key" });
    if (b.error) return { ok: false, error: b.error.message };
    await bustTag("settings"); revalidatePath("/", "layout");
    await audit("theme.preset", `Applied the ${id} preset`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
