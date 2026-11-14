import { getT } from "@/lib/i18n/server";
import { AskQuestion } from "@/components/AskQuestion";
import type { PublicQuestion } from "@/lib/questions";

export async function QuestionsSection({ slug, questions }: { slug: string; questions: PublicQuestion[] }) {
  const { t, locale } = await getT();
  return (
    <section className="mt-24" aria-labelledby="qa-h">
      <h2 id="qa-h" className="display text-2xl sm:text-3xl">{t("Questions and answers")}</h2>
      {questions.length === 0 ? <p className="mt-3 text-muted">{t("No questions yet. Ask the first one.")}</p> : (
        <ul className="mt-6 divide-y divide-ink/15 border-y border-ink/15">
          {questions.map((q) => (
            <li key={q.id} className="py-5">
              <p className="font-bold">{t("Q:")} {q.question}</p>
              <p className="mt-2 max-w-2xl whitespace-pre-line">{t("A:")} {q.answer}</p>
              <p className="mt-1 text-xs text-muted">{q.name ? `${t("Asked by {name}", { name: q.name })} · ` : ""}{t("Answered by Sparkthunder")} · {new Date(q.answeredAt).toLocaleDateString(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", year: "numeric" })}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8"><h3 className="display text-xl">{t("Ask a question")}</h3><div className="mt-4"><AskQuestion slug={slug} /></div></div>
    </section>
  );
}
