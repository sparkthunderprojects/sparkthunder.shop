"use client";

import { useT } from "@/components/LocaleProvider";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { quoteDiscountAction, type QuoteResult } from "@/app/(shop)/checkout/discount";
import type { CartInput } from "@/lib/shop/types";
import { useMoney } from "@/components/Currency";

const KEY = "sparkthunder-discount-v1";

/** Remembers one discount code and re-prices it whenever the basket changes. Nothing is used up until checkout. */
export function useDiscount(cart: CartInput) {
  const [code, setCodeState] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const seq = useRef(0);
  const cartKey = JSON.stringify(cart.map((c) => [c.slug, c.qty]));

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setCodeState(s); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    if (!code) { setQuote(null); return; }
    const mine = ++seq.current;
    quoteDiscountAction(cart, code).then((r) => { if (mine === seq.current) setQuote(r); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, cartKey, loaded]);

  const setCode = (c: string | null) => {
    setCodeState(c);
    try { if (c) localStorage.setItem(KEY, c); else localStorage.removeItem(KEY); } catch {}
  };
  return { code, setCode, quote, amountPence: quote?.ok ? quote.amountPence : 0 };
}

export function DiscountApply({ code, setCode, quote }: { code: string | null; setCode: (c: string | null) => void; quote: QuoteResult | null }) {
  const { t } = useT();
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const id = useId();

  if (code) {
    return (
      <div className="mt-4 border border-ink/20 bg-paper px-3 py-2 text-sm">
        <p className="flex items-center justify-between gap-3">
          <span><b>{t("Discount code")}</b> <span className="font-mono">{quote?.ok ? quote.code : code}</span>{quote?.ok ? <><br />{t("{label}: you save {amount}", { label: quote.label, amount: money(quote.amountPence) })}</> : null}</span>
          <button onClick={() => setCode(null)} className="underline underline-offset-4">{t("Remove")}</button>
        </p>
        {quote && !quote.ok ? <p role="alert" className="mt-1 font-bold text-red-700">{t(quote.error)}</p> : null}
      </div>
    );
  }
  return (
    <div className="mt-4">
      {!open ? <button onClick={() => setOpen(true)} className="text-sm font-bold underline underline-offset-4">{t("Have a discount code?")}</button> : (
        <form onSubmit={(e) => { e.preventDefault(); setErr(""); const c = text.trim(); if (!c) return; start(async () => { setCode(c.toUpperCase()); setText(""); setOpen(false); }); }}>
          <label htmlFor={id} className="text-sm font-bold">{t("Discount code")}</label>
          <div className="mt-1 flex gap-2">
            <input id={id} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" spellCheck={false} placeholder={t("Enter code")} className="min-w-0 flex-1 border border-ink/20 bg-paper px-3 py-2 font-mono text-sm uppercase" />
            <button className="btn btn-sm btn-ink" disabled={pending || !text.trim()}>{t("Apply")}</button>
          </div>
          {err ? <p role="alert" className="mt-1 text-sm font-bold text-red-700">{t(err)}</p> : null}
        </form>
      )}
    </div>
  );
}
