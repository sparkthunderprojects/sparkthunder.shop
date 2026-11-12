"use server";

import { revalidatePath } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { normaliseCharacters, type CharacterProfile } from "@/lib/character-config";
import { bustTag } from "@/lib/tags";

type Result = { ok: true } | { ok: false; error: string };

/** Saves the whole list in the owner's order. Rows with no name are dropped; slugs are made unique. */
export async function saveCharactersAction(input: CharacterProfile[]): Promise<Result> {
  try {
    const { db } = await requireAdminAction("catalogue");
    const list = normaliseCharacters(input);
    if (list.length > 200) return { ok: false, error: "That is a lot of characters. Keep it to 200 or fewer." };
    const { error } = await db.from("settings").upsert({ key: "characters", value: list }, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
    await bustTag("settings"); revalidatePath("/", "layout");
    await audit("characters.save", `Saved ${list.length} characters`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
