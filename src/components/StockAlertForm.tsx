"use client";

import { useId, useState, useTransition } from "react";
import { subscribeStockAlertAction } from "@/app/(shop)/stock-alerts/actions";

/** Sold-out products and options: "Email me when it's back". One email, one time. */
export function StockAlertForm({ slug, variant, label }: { slug: string; variant: string; label: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const id = useId();

  if (done) return <p role="status" className="border border-ink/20 bg-paper-2 p-4 text-sm font-bold">Thanks! We will email {email} once {label} is back in stock.</p>;
  return (
    <form className="border border-ink/20 bg-paper-2 p-4" onSubmit={(e) => { e.preventDefault(); setErr(""); start(async () => { const r = await subscribeStockAlertAction(slug, variant, email); if (r.ok) setDone(true); else setErr(r.error); }); }}>
      <label htmlFor={id} className="font-bold">Sold out. Want to know when it is back?</label>
      <div className="mt-2 flex gap-2">
        <input id={id} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="Your email address" className="min-w-0 flex-1 border border-ink/20 bg-paper px-3 py-2" />
        <button className="btn btn-sm btn-ink" disabled={pending || !email.trim()}>{pending ? "..." : "Email me"}</button>
      </div>
      <p className="mt-2 text-xs text-muted">We will send one email when it is back in stock, and use your address for nothing else.</p>
      {err ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{err}</p> : null}
    </form>
  );
}
