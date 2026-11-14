/* eslint-disable @next/next/no-img-element -- these show images at addresses the store owner or a customer supplied, which next/image cannot optimise */
import { getT } from "@/lib/i18n/server";
import { ReviewForm } from "@/components/ReviewForm";
import { Stars } from "@/components/Stars";
import type { ReviewSummary } from "@/lib/reviews";

export async function ReviewsSection({ slug, summary }: { slug: string; summary: ReviewSummary }) {
  const { t, locale } = await getT();
  return (
    <section className="mt-24" aria-labelledby="reviews-h">
      <h2 id="reviews-h" className="display text-2xl sm:text-3xl">{t("Reviews")}</h2>
      {summary.count > 0 ? (
        <p className="mt-3 flex items-center gap-3"><Stars value={summary.average} size={22} /><b>{summary.average.toFixed(1)}</b><span className="text-muted">{summary.count === 1 ? t("from 1 verified buyer") : t("from {n} verified buyers", { n: summary.count })}</span></p>
      ) : <p className="mt-3 text-muted">{t("No reviews yet. Be the first once your order arrives.")}</p>}
      {summary.reviews.length > 0 && (
        <ul className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
          {summary.reviews.map((r) => (
            <li key={r.id} className="py-6">
              <div className="flex flex-wrap items-center gap-3"><Stars value={r.rating} /><b>{r.title || t("Review")}</b></div>
              <p className="mt-1 text-sm text-muted">{r.name} · {t("Verified buyer")} · {new Date(r.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="mt-3 max-w-2xl whitespace-pre-line">{r.body}</p>
              {r.photos.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-3">
                  {r.photos.map((src, i) => (
                    <li key={src}><a href={src} target="_blank" rel="noopener"><img src={src} alt={t("Customer photo {n} from {name}", { n: i + 1, name: r.name })} width={96} height={96} loading="lazy" className="h-24 w-24 border border-ink/15 object-cover" /></a></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-10"><h3 className="display text-xl">{t("Write a review")}</h3><div className="mt-4"><ReviewForm slug={slug} name="" /></div></div>
    </section>
  );
}
