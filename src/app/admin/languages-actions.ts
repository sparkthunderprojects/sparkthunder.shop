"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { logActivity as audit } from "@/lib/admin/activity";
import { normaliseLanguages } from "@/lib/i18n/config";
import { bustTag } from "@/lib/tags";

export async function saveLanguagesAction(enabled: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { db } = await requireAdminAction("settings");
    const value = { enabled: normaliseLanguages({ enabled }) };
    const { error } = await db.from("settings").upsert({ key: "languages", value }, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
    await bustTag("settings");
    revalidatePath("/", "layout");
    await audit("languages.save", `Languages on: ${value.enabled.join(", ")}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
