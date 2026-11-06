"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { REVIEWS_TAG } from "@/lib/reviews";

type Result = { ok: true } | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function bust(slug: string) {
  updateTag(REVIEWS_TAG);
  revalidatePath(`/products/${slug}`);
  revalidatePath("/admin/reviews");
}

export async function moderateReviewAction(id: string, slug: string, status: "approved" | "rejected" | "pending"): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { error } = await db.from("reviews").update({ status }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    bust(slug);
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function deleteReviewAction(id: string, slug: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { error } = await db.from("reviews").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    bust(slug);
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
