"use server";

import { logActivity as audit } from "@/lib/admin/activity";

import { revalidatePath } from "next/cache";
import { bustTag } from "@/lib/tags";
import { requireAdminAction } from "@/lib/admin/auth";
import { normaliseStore, type StoreSettings } from "@/lib/store-config";

export async function saveStoreAction(input: StoreSettings): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { db } = await requireAdminAction();
    const value = normaliseStore(input); // checked and clamped on the server, whatever the browser sent
    if (!value.name) return { ok: false, error: "Give the store a name." };
    const { error } = await db.from("settings").upsert({ key: "store", value }, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
    await bustTag("settings");
    revalidatePath("/", "layout");
    await audit("store.save", "Saved store settings");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
