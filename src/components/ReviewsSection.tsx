import { ReviewForm } from "@/components/ReviewForm";
import { Stars } from "@/components/Stars";
import type { ReviewSummary } from "@/lib/reviews";

export function ReviewsSection({ slug, summary }: { slug: string; summary: ReviewSummary }) {
  return (
    <section className="mt-24" aria-labelledby="reviews-h">
      <h2 id="reviews-h" className="display text-2xl sm:text-3xl">Reviews</h2>
      {summary.count > 0 ? (
        <p className="mt-3 flex items-center gap-3"><Stars value={summary.average} size={22} /><b>{summary.average.toFixed(1)}</b><span className="text-muted">from {summary.count} verified {summary.count === 1 ? "buyer" : "buyers"}</span></p>
      ) : <p className="mt-3 text-muted">No reviews yet. Be the first once your order arrives.</p>}
      {summary.reviews.length > 0 && (
        <ul className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
          {summary.reviews.map((r) => (
            <li key={r.id} className="py-6">
              <div className="flex flex-wrap items-center gap-3"><Stars value={r.rating} /><b>{r.title || "Review"}</b></div>
              <p className="mt-1 text-sm text-muted">{r.name} · Verified buyer · {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="mt-3 max-w-2xl whitespace-pre-line">{r.body}</p>
              {r.photos.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-3">
                  {r.photos.map((src, i) => (
                    <li key={src}><a href={src} target="_blank" rel="noopener"><img src={src} alt={`Customer photo ${i + 1} from ${r.name}`} width={96} height={96} loading="lazy" className="h-24 w-24 border border-ink/15 object-cover" /></a></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-10"><h3 className="display text-xl">Write a review</h3><div className="mt-4"><ReviewForm slug={slug} name="" /></div></div>
    </section>
  );
}
