"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { lookupGiftCardAction } from "@/app/(shop)/gift-cards/actions";
import { formatCode } from "@/lib/giftcards/format";
import { formatPrice } from "@/lib/site";

export type AppliedCard = { code: string; balancePence: number };
const KEY = "sparkthunder-giftcard-v1";

/** Remembers one applied card in the browser and re-checks its balance on load. Nothing is spent until checkout. */
export function useAppliedGiftCard() {
  const [card, setCardState] = useState<AppliedCard | null>(null);
  useEffect(() => {
    let saved: AppliedCard | null = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch {}
    if (!saved?.code) return;
    lookupGiftCardAction(saved.code).then((r) => {
      if (r.ok && r.status === "active") setCardState({ code: r.code, balancePence: r.balancePence });
      else { try { localStorage.removeItem(KEY); } catch {} }
    });
  }, []);
  const setCard = (c: AppliedCard | null) => {
    setCardState(c);
    try { c ? localStorage.setItem(KEY, JSON.stringify(c)) : localStorage.removeItem(KEY); } catch {}
  };
  return { card, setCard };
}

export function GiftCardApply({ card, setCard }: { card: AppliedCard | null; setCard: (c: AppliedCard | null) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const id = useId();

  if (card) {
    return (
      <p className="mt-4 flex items-center justify-between gap-3 border border-ink/20 bg-paper px-3 py-2 text-sm">
        <span><b>Gift card</b> <span className="font-mono">{formatCode(card.code)}</span><br />{formatPrice(card.balancePence)} available</span>
        <button onClick={() => setCard(null)} className="underline underline-offset-4">Remove</button>
      </p>
    );
  }
  return (
    <div className="mt-4">
      {!open ? <button onClick={() => setOpen(true)} className="text-sm font-bold underline underline-offset-4">Have a gift card?</button> : (
        <form onSubmit={(e) => { e.preventDefault(); setErr(""); start(async () => { const r = await lookupGiftCardAction(code); if (!r.ok) return setErr(r.error); if (r.status !== "active") return setErr(r.status === "used" ? "That card has no balance left." : r.status === "expired" ? "That card has expired." : "That card cannot be used."); setCard({ code: r.code, balancePence: r.balancePence }); setCode(""); setOpen(false); }); }}>
          <label htmlFor={id} className="text-sm font-bold">Gift card code</label>
          <div className="mt-1 flex gap-2">
            <input id={id} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} placeholder="SPK-XXXX-XXXX-XXXX" className="min-w-0 flex-1 border border-ink/20 bg-paper px-3 py-2 font-mono text-sm" />
            <button className="btn btn-sm btn-ink" disabled={pending || !code.trim()}>{pending ? "..." : "Apply"}</button>
          </div>
          {err ? <p role="alert" className="mt-1 text-sm font-bold text-red-700">{err}</p> : null}
        </form>
      )}
    </div>
  );
}
