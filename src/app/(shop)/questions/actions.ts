"use server";

import { headers } from "next/headers";
import { getProduct } from "@/lib/catalog";
import { serviceClient } from "@/lib/db/clients";

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 4;
}

export async function askQuestionAction(form: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (String(form.get("website") ?? "")) return { ok: true }; // hidden field: bots fill it, people never see it
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (limited(ip)) return { ok: false, error: "Too many questions in a short time. Please try again later." };
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
