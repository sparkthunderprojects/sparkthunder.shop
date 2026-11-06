import { AskQuestion } from "@/components/AskQuestion";
import type { PublicQuestion } from "@/lib/questions";

export function QuestionsSection({ slug, questions }: { slug: string; questions: PublicQuestion[] }) {
  return (
    <section className="mt-24" aria-labelledby="qa-h">
      <h2 id="qa-h" className="display text-2xl sm:text-3xl">Questions and answers</h2>
      {questions.length === 0 ? <p className="mt-3 text-muted">No questions yet. Ask the first one.</p> : (
        <ul className="mt-6 divide-y divide-ink/15 border-y border-ink/15">
          {questions.map((q) => (
            <li key={q.id} className="py-5">
              <p className="font-bold">Q: {q.question}</p>
              <p className="mt-2 max-w-2xl whitespace-pre-line">A: {q.answer}</p>
              <p className="mt-1 text-xs text-muted">{q.name ? `Asked by ${q.name} · ` : ""}Answered by Sparkthunder · {new Date(q.answeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8"><h3 className="display text-xl">Ask a question</h3><div className="mt-4"><AskQuestion slug={slug} /></div></div>
    </section>
  );
}
