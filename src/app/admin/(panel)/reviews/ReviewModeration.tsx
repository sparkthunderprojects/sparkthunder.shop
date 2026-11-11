"use client";
/* eslint-disable @next/next/no-img-element -- these show images at addresses the store owner or a customer supplied, which next/image cannot optimise */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteReviewAction, moderateReviewAction } from "../../review-actions";
import { useAction } from "../../ui";
import type { ReviewRow } from "@/lib/reviews";

const BADGE = { pending: "adm-warn", approved: "adm-ok", rejected: "adm-bad" } as const;
const LABEL = { pending: "Waiting", approved: "Published", rejected: "Rejected" } as const;

export function ReviewModeration({ rows }: { rows: ReviewRow[] }) {
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const order = { pending: 0, approved: 1, rejected: 2 } as const;
  const sorted = [...rows].sort((a, b) => order[a.status] - order[b.status]);
  if (rows.length === 0) return <section className="adm-card"><p className="adm-hint">No reviews yet. Buyers can review from the product page once signed in.</p></section>;
  return (
    <>
      {toast}
      {sorted.map((r) => (
        <section key={r.id} className="adm-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div><b>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b> {r.title ? <b>{r.title}</b> : null}
              <div className="adm-hint">{r.name} · {r.email} · <Link href={`/admin/products/${r.product_slug}`}>{r.product_slug}</Link> · {new Date(r.created_at).toLocaleDateString("en-GB")}</div></div>
            <span className={`adm-badge ${BADGE[r.status]}`}>{LABEL[r.status]}</span>
          </div>
          <p style={{ margin: "10px 0", whiteSpace: "pre-line" }}>{r.body}</p>
          {(r.photos ?? []).length > 0 ? <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>{(r.photos ?? []).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Customer photo" width={80} height={80} style={{ objectFit: "cover", borderRadius: 6 }} /></a>)}</div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            {r.status !== "approved" ? <button className="adm-btn adm-pri" disabled={pending} onClick={() => run(() => moderateReviewAction(r.id, r.product_slug, "approved"), "Review published", () => router.refresh())}>Approve</button> : null}
            {r.status !== "rejected" ? <button className="adm-btn" disabled={pending} onClick={() => run(() => moderateReviewAction(r.id, r.product_slug, "rejected"), "Review rejected", () => router.refresh())}>Reject</button> : null}
            <button className="adm-btn" disabled={pending} onClick={() => { if (confirm("Delete this review for good?")) run(() => deleteReviewAction(r.id, r.product_slug), "Review deleted", () => router.refresh()); }}>Delete</button>
          </div>
        </section>
      ))}
    </>
  );
}
