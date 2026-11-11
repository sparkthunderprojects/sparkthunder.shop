"use client";
import { useState, useTransition } from "react";
import { saveBasketAction } from "@/app/(shop)/checkout/basket-email";
import { BASKET_CONSENT } from "@/lib/consent-text";
import type { CartInput } from "@/lib/shop/types";

/** Optional: "email me this basket". Nothing is stored unless the customer ticks the consent box. */
export function BasketReminder({ cart }: { cart: CartInput }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  if (ok) return <p role="status" className="mt-4 text-sm font-bold">Thanks. We will send you one reminder about this basket.</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="mt-4 text-sm font-bold underline underline-offset-4">Not ready? Email me this basket</button>;
  return (
    <form className="mt-4 grid gap-2 text-sm" onSubmit={(e) => { e.preventDefault(); setErr(""); start(async () => { const r = await saveBasketAction(cart, email, consent); if (r.ok) setOk(true); else setErr(r.error); }); }}>
      <label className="grid gap-1 font-bold">Your email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="border border-ink/30 bg-paper px-3 py-2 font-normal" /></label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" /><span>{BASKET_CONSENT}</span></label>
      {err ? <p role="alert" className="font-bold text-red-700">{err}</p> : null}
      <div className="flex gap-3"><button className="btn btn-sm btn-ink" disabled={busy || !consent}>{busy ? "Saving..." : "Remind me"}</button><button type="button" className="underline underline-offset-4" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
