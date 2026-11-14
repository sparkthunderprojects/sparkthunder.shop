"use client";

import { useT } from "@/components/LocaleProvider";import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestReturnAction } from "@/app/(shop)/account/returns";
import { RETURN_REASONS } from "@/lib/returns";

export type ReturnLine = { line: number; name: string; qty: number };

export function ReturnRequest({ orderId, lines }: { orderId: string; lines: ReturnLine[] }) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [details, setDetails] = useState("");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  if (!open) return <button onClick={() => setOpen(true)} className="mt-3 text-sm font-bold underline underline-offset-4">{t("Return an item")}</button>;
  return (
    <form className="mt-3 grid gap-3 border border-ink/20 bg-paper-2 p-4 text-sm" onSubmit={(e) => { e.preventDefault(); setErr("");
      start(async () => { const r = await requestReturnAction(orderId, { items: lines.map((l) => ({ line: l.line, qty: qty[l.line] ?? 0 })).filter((x) => x.qty > 0), reason, details });
        if (r.ok) router.refresh(); else setErr(t(r.error)); }); }}>
      <fieldset className="grid gap-2"><legend className="font-bold">{t("Which items?")}</legend>
        {lines.map((l) => (
          <label key={l.line} className="flex items-center justify-between gap-3"><span>{l.name}</span>
            <select value={qty[l.line] ?? 0} onChange={(e) => setQty((q) => ({ ...q, [l.line]: Number(e.target.value) }))} className="border border-ink/30 bg-paper px-2 py-1">
              {Array.from({ length: l.qty + 1 }, (_, n) => <option key={n} value={n}>{n === 0 ? t("Keep") : t("Return {n}", { n })}</option>)}
            </select></label>
        ))}
      </fieldset>
      <label className="grid gap-1 font-bold">{t("Reason")}<select value={reason} onChange={(e) => setReason(e.target.value)} className="border border-ink/30 bg-paper px-3 py-2 font-normal">{RETURN_REASONS.map((r) => <option key={r} value={r}>{t(r)}</option>)}</select></label>
      <label className="grid gap-1 font-bold">{t("Anything else we should know? (optional)")}<textarea value={details} onChange={(e) => setDetails(e.target.value.slice(0, 1000))} rows={3} className="border border-ink/30 bg-paper px-3 py-2 font-normal" /></label>
      {err ? <p role="alert" className="font-bold text-red-700">{err}</p> : null}
      <div className="flex gap-3"><button className="btn btn-sm btn-ink" disabled={busy}>{busy ? t("Sending...") : t("Send request")}</button><button type="button" className="underline underline-offset-4" onClick={() => setOpen(false)}>{t("Cancel")}</button></div>
    </form>
  );
}
