"use client";

import { useT } from "@/components/LocaleProvider";import { useState } from "react";
import { askQuestionAction } from "@/app/(shop)/questions/actions";

export function AskQuestion({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const { t } = useT();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (msg?.ok) return <p role="status" className="font-bold">{msg.text}</p>;
  return (
    <form className="grid max-w-xl gap-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMsg(null);
      const f = new FormData(e.currentTarget); f.set("slug", slug);
      const r = await askQuestionAction(f); setBusy(false);
      setMsg(r.ok ? { ok: true, text: t("Thanks! Our team will answer it, and it will appear here once answered.") } : { ok: false, text: t(r.error) });
    }}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="grid gap-1 font-bold">{t("Your question")}<textarea name="question" required minLength={10} maxLength={300} rows={3} className="border border-ink/30 bg-paper px-3 py-2 font-normal" placeholder={t("Is it dishwasher safe? What size is it?")} /></label>
      <label className="grid gap-1 font-bold">{t("Name (optional)")}<input name="name" maxLength={40} className="border border-ink/30 bg-paper px-3 py-2 font-normal" /></label>
      <div className="flex items-center gap-4"><button className="btn" disabled={busy}>{busy ? t("Sending...") : t("Ask a question")}</button>{msg ? <span role="alert" className="text-sm font-bold">{msg.text}</span> : null}</div>
      <p className="text-xs text-muted">{t("We do not collect your email for this. Questions are published only once answered.")}</p>
    </form>
  );
}
