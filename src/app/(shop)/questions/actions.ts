"use server";

import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { getProduct } from "@/lib/catalog";
import { serviceClient } from "@/lib/db/clients";


export async function askQuestionAction(form: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (String(form.get("website") ?? "")) return { ok: true }; // hidden field: bots fill it, people never see it
    if (!(await rateLimit("question", LIMITS.question)).ok) return { ok: false, error: "Too many questions in a short time. Please try again later." };
    const slug = String(form.get("slug") ?? "");
    const product = await getProduct(slug);
    if (!product) return { ok: false, error: "We could not find that product." };
    const question = String(form.get("question") ?? "").replace(/\s+/g, " ").trim();
    if (question.length < 10) return { ok: false, error: "Please ask a full question (at least 10 characters)." };
    if (question.length > 300) return { ok: false, error: "Please keep your question under 300 characters." };
    if (/https?:\/\/|www\./i.test(question)) return { ok: false, error: "Please leave links out of your question." };
    const name = String(form.get("name") ?? "").trim().slice(0, 40);
    const db = serviceClient();
    if (!db) return { ok: false, error: "Questions are not available yet." };
    const { error } = await db.from("product_questions").insert({ product_slug: slug, name, question, answer: "", status: "pending", created_at: new Date().toISOString() });
    if (error) return { ok: false, error: "We could not save your question. Please try again." };
    return { ok: true };
  } catch { return { ok: false, error: "Something went wrong. Please try again." }; }
}
