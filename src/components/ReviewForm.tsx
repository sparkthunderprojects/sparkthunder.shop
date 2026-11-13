"use client";
import { useEffect, useState } from "react";
import Link from "@/components/LocaleLink";
import { reviewEligibilityAction, submitReviewAction, type Eligibility } from "@/app/(shop)/reviews/actions";

async function shrink(file: File, maxEdge = 1400): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/webp", 0.85));
    return blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
  } catch { return file; }
}

export function ReviewForm({ slug, name }: { slug: string; name: string }) {
  const [el, setEl] = useState<Eligibility | null>(null);
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { reviewEligibilityAction(slug).then(setEl).catch(() => setEl({ state: "unavailable" })); }, [slug]);

  if (!el) return null;
  if (el.state === "anon") return <p className="text-muted">Bought this? <Link className="font-bold underline underline-offset-4" href={`/account/login?next=/products/${slug}`}>Sign in with your Sparkthunder ID</Link> to leave a review.</p>;
  if (el.state === "not_buyer") return <p className="text-muted">Only customers who have bought this product can review it.</p>;
  if (el.state === "already") return <p className="text-muted">Thanks, you have already reviewed this product.</p>;
  if (el.state === "unavailable") return null;
  if (msg?.ok) return <p role="status" className="font-bold">{msg.text}</p>;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) { setMsg({ ok: false, text: "Choose a star rating." }); return; }
    setBusy(true); setMsg(null);
    const f = new FormData(e.currentTarget);
    const files = (f.getAll("photos") as File[]).filter((x) => x.size > 0).slice(0, 3);
    f.delete("photos");
    for (const x of files) f.append("photos", await shrink(x));
    f.set("rating", String(rating)); f.set("slug", slug);
    const r = await submitReviewAction(f);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Thank you! Your review is with our team and will appear once approved." } : { ok: false, text: r.error });
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4">
      <fieldset><legend className="mb-1 font-bold">Your rating</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)} className="p-0.5">
              <svg width="30" height="30" viewBox="0 0 24 24" fill={rating >= i ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" /></svg>
            </button>
          ))}
        </div></fieldset>
      <label className="grid gap-1 font-bold">Name shown<input name="name" defaultValue={el.name || name} maxLength={40} className="border border-ink/30 bg-paper px-3 py-2 font-normal" /></label>
      <label className="grid gap-1 font-bold">Headline (optional)<input name="title" maxLength={80} className="border border-ink/30 bg-paper px-3 py-2 font-normal" /></label>
      <label className="grid gap-1 font-bold">Your review<textarea name="body" required minLength={10} maxLength={2000} rows={5} className="border border-ink/30 bg-paper px-3 py-2 font-normal" /></label>
      <label className="grid gap-1 font-bold">Photos (optional, up to 3)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="font-normal" /></label>
      <div className="flex items-center gap-4"><button className="btn" disabled={busy}>{busy ? "Sending..." : "Submit review"}</button>{msg ? <span role="alert" className="text-sm font-bold">{msg.text}</span> : null}</div>
      <p className="text-sm text-muted">Reviews are checked before they appear. Please only share photos you took yourself.</p>
    </form>
  );
}
