"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { answerQuestionAction, deleteQuestionAction, setQuestionStatusAction } from "../../question-actions";
import { useAction } from "../../ui";
import type { QuestionRow } from "@/lib/questions";

const BADGE = { pending: "adm-warn", answered: "adm-ok", rejected: "adm-bad" } as const;
const LABEL = { pending: "Waiting", answered: "Published", rejected: "Hidden" } as const;
const ORDER = { pending: 0, answered: 1, rejected: 2 } as const;

function Item({ q }: { q: QuestionRow }) {
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const [text, setText] = useState(q.question);
  const [ans, setAns] = useState(q.answer);
  return (
    <section className="adm-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div className="adm-hint"><Link href={`/admin/products/${q.product_slug}`}>{q.product_slug}</Link> · {q.name || "Anonymous"} · {new Date(q.created_at).toLocaleDateString("en-GB")}</div>
        <span className={`adm-badge ${BADGE[q.status]}`}>{LABEL[q.status]}</span>
      </div>
      <textarea className="adm-in" rows={2} value={text} onChange={(e) => setText(e.target.value)} style={{ marginTop: 8 }} aria-label="Question (you can tidy the wording)" />
      <textarea className="adm-in" rows={3} value={ans} onChange={(e) => setAns(e.target.value)} placeholder="Your answer" style={{ marginTop: 8 }} aria-label="Answer" />
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="adm-btn adm-pri" disabled={pending} onClick={() => run(() => answerQuestionAction(q.id, q.product_slug, ans, text), "Answer published", () => router.refresh())}>{q.status === "answered" ? "Update answer" : "Publish answer"}</button>
        {q.status !== "rejected" ? <button className="adm-btn" disabled={pending} onClick={() => run(() => setQuestionStatusAction(q.id, q.product_slug, "rejected"), "Hidden", () => router.refresh())}>Hide</button> : null}
        <button className="adm-btn" disabled={pending} onClick={() => { if (confirm("Delete this question?")) run(() => deleteQuestionAction(q.id, q.product_slug), "Deleted", () => router.refresh()); }}>Delete</button>
        {toast}
      </div>
    </section>
  );
}

export function QuestionList({ rows }: { rows: QuestionRow[] }) {
  if (!rows.length) return <section className="adm-card"><p className="adm-hint">No questions yet. The form is on every product page.</p></section>;
  return <>{[...rows].sort((a, b) => ORDER[a.status] - ORDER[b.status]).map((q) => <Item key={q.id} q={q} />)}</>;
}
