import { requireAdmin } from "@/lib/admin/auth";
import type { QuestionRow } from "@/lib/questions";
import { QuestionList } from "./QuestionList";

export const metadata = { title: "Questions" };

export default async function QuestionsAdmin() {
  const { db } = await requireAdmin();
  const { data } = await db.from("product_questions").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as QuestionRow[];
  const pending = rows.filter((r) => r.status === "pending").length;
  return (
    <>
      <div className="adm-h"><div><h1>Product questions</h1><p>Shoppers ask on product pages. Answer one to publish it (and add it to the page&apos;s search data); questions stay private until you answer.{pending ? ` ${pending} waiting.` : ""}</p></div></div>
      <QuestionList rows={rows} />
    </>
  );
}
