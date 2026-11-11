"use server";

import { logActivity as audit } from "@/lib/admin/activity";

import { revalidatePath } from "next/cache";
import { bustTag } from "@/lib/tags";
import { requireAdminAction } from "@/lib/admin/auth";
import { QUESTIONS_TAG } from "@/lib/questions";

type Result = { ok: true } | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
async function bust(slug: string) { await bustTag(QUESTIONS_TAG); revalidatePath(`/products/${slug}`); revalidatePath("/admin/questions"); }

export async function answerQuestionAction(id: string, slug: string, answer: string, question: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction("content");
    const a = answer.trim();
    if (a.length < 2) return { ok: false, error: "Write an answer first." };
    const { error } = await db.from("product_questions").update({ answer: a.slice(0, 1000), question: question.trim().slice(0, 300), status: "answered", answered_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await bust(slug);
    await audit("question.answer", `Answered a question on ${slug}`, { type: "question", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function setQuestionStatusAction(id: string, slug: string, status: "rejected" | "pending"): Promise<Result> {
  try {
    const { db } = await requireAdminAction("content");
    const { error } = await db.from("product_questions").update({ status }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await bust(slug);
    await audit("question.status", `Set a question to ${status}`, { type: "question", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function deleteQuestionAction(id: string, slug: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction("content");
    const { error } = await db.from("product_questions").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    await bust(slug);
    await audit("question.delete", "Deleted a question", { type: "question", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
