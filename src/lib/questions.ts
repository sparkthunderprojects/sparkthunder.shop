import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";

export type QuestionRow = { id: string; product_slug: string; name: string; question: string; answer: string; status: "pending" | "answered" | "rejected"; created_at: string; answered_at: string | null };
export type PublicQuestion = { id: string; name: string; question: string; answer: string; answeredAt: string };
export const QUESTIONS_TAG = "questions";

/** Answered questions for a product (cached; busted when you answer one). */
export const getQuestions = (slug: string) =>
  unstable_cache(
    async (): Promise<PublicQuestion[]> => {
      const db = publicClient();
      if (!db) return [];
      const { data, error } = await db.from("product_questions").select("*").eq("product_slug", slug).eq("status", "answered").order("answered_at", { ascending: false }).limit(30);
      if (error || !data) return [];
      return (data as QuestionRow[]).map((r) => ({ id: r.id, name: r.name, question: r.question, answer: r.answer, answeredAt: r.answered_at ?? r.created_at }));
    },
    ["questions", slug],
    { tags: [QUESTIONS_TAG], revalidate: 300 },
  )();
