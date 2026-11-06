"use server";

import { revalidatePath } from "next/cache";
import { bustTag } from "@/lib/tags";
import { requireAdminAction } from "@/lib/admin/auth";
import { serviceClient } from "@/lib/db/clients";
import { awardPoints, REVIEW_BONUS } from "@/lib/rewards";
import { REVIEWS_TAG } from "@/lib/reviews";

type Result = { ok: true } | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

async function bust(slug: string) {
  await bustTag(REVIEWS_TAG);
  revalidatePath(`/products/${slug}`);
  revalidatePath("/admin/reviews");
}

export async function moderateReviewAction(id: string, slug: string, status: "approved" | "rejected" | "pending"): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { error } = await db.from("reviews").update({ status }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    if (status === "approved") {
      // Thank the buyer with points (once per review). Their email is only readable with the server key.
      const svc = serviceClient();
      const row = svc ? await svc.from("reviews").select("email").eq("id", id).maybeSingle() : null;
      const email = (row?.data as { email: string } | null)?.email;
      if (svc && email) await awardPoints(svc, { email, points: REVIEW_BONUS, reason: "review", ref: id, note: "Thanks for your review" }).catch(() => false);
    }
    await bust(slug);
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function deleteReviewAction(id: string, slug: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { error } = await db.from("reviews").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    await bust(slug);
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
