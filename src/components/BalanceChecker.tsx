"use client";

import { useId, useState, useTransition } from "react";
import { lookupGiftCardAction, type LookupResult } from "@/app/(shop)/gift-cards/actions";
import { formatCode } from "@/lib/giftcards/format";
import { formatPrice } from "@/lib/site";

const NOTE = { active: "", used: "This card has been fully spent.", expired: "This card has expired.", disabled: "This card is not currently usable. Contact us if you think that is a mistake." } as const;

export function BalanceChecker() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<LookupResult | null>(null);
  const [pending, start] = useTransition();
  const id = useId();
  return (
    <div className="mt-8 max-w-lg">
      <form onSubmit={(e) => { e.preventDefault(); start(async () => setRes(await lookupGiftCardAction(code))); }} className="space-y-3">
        <label htmlFor={id} className="font-bold">Gift card code</label>
        <input id={id} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} placeholder="SPK-XXXX-XXXX-XXXX" className="w-full border border-ink/20 bg-paper px-3 py-3 font-mono text-lg tracking-wider focus:border-ink" />
        <button className="btn" disabled={pending || !code.trim()}>{pending ? "Checking..." : "Check balance"}</button>
      </form>
      <div aria-live="polite" className="mt-6">
        {res && !res.ok ? <p className="font-bold text-red-700">{res.error}</p> : null}
        {res && res.ok ? (
          <div className="border-2 border-ink p-6">
            <p className="font-mono text-sm text-muted">{formatCode(res.code)}</p>
            <p className="display mt-1 text-5xl">{formatPrice(res.status === "active" ? res.balancePence : 0)}</p>
            <p className="mt-2 text-muted">{res.status === "active" ? `remaining${res.expiresAt ? `, valid until ${new Date(res.expiresAt).toLocaleDateString("en-GB")}` : ""}` : NOTE[res.status]}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
