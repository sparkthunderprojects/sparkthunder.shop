"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { logActivity } from "@/lib/admin/activity";
import { normaliseSocial, type SocialData } from "@/lib/social";

type Result = { ok: true; data: SocialData } | { ok: false; error: string };

/** Saves this store's social accounts and posts (the store being edited). */
export async function saveSocialAction(input: SocialData): Promise<Result> {
  try {
    const { db } = await requireAdminAction("marketing");
    const value = normaliseSocial(input);
    const { error } = await db.from("settings").upsert({ key: "social", value }, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/social");
    await logActivity("social.save", `Saved social plan (${value.posts.length} posts)`);
    return { ok: true, data: value };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
