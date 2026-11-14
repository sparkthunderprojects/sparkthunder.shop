"use client";

import { useT } from "@/components/LocaleProvider";
import { useId, useState, useTransition } from "react";
import { sendHelpMessageAction } from "@/app/(shop)/help/actions";
import { HELP_TOPICS } from "@/lib/help";

export function HelpContactForm({ topic }: { topic: string }) {
  const id = useId();
  const { t } = useT();
  const [res, setRes] = useState<{ ok: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const input = "w-full border border-ink/20 bg-paper px-3 py-3 focus:border-ink";
  if (res?.ok) return <p role="status" className="max-w-xl border border-ink/15 bg-paper-2 p-6 font-bold" data-help="sent">{t("Thank you. Your message has been sent and we will reply by email as soon as we can.")}</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => setRes(await sendHelpMessageAction(fd))); }} className="max-w-xl space-y-4" data-help="form">
      <div><label htmlFor={`${id}-t`} className="font-bold">{t("What is it about?")}</label>
        <select id={`${id}-t`} name="topic" defaultValue={topic} className={input}>{HELP_TOPICS.map((o) => <option key={o} value={o}>{t(o)}</option>)}</select></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor={`${id}-n`} className="font-bold">{t("Your name")}</label><input id={`${id}-n`} name="name" required autoComplete="name" className={input} /></div>
        <div><label htmlFor={`${id}-e`} className="font-bold">{t("Your email")}</label><input id={`${id}-e`} name="email" type="email" required autoComplete="email" className={input} /></div>
      </div>
      <div><label htmlFor={`${id}-o`} className="font-bold">{t("Order number")} <span className="font-normal text-muted">{t("(if you have one)")}</span></label><input id={`${id}-o`} name="order" className={input} /></div>
      <div><label htmlFor={`${id}-m`} className="font-bold">{t("How can we help?")}</label><textarea id={`${id}-m`} name="message" required rows={6} maxLength={3000} className={input} /></div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {res && !res.ok ? <p role="alert" className="font-bold text-red-700">{t(res.error ?? "")}</p> : null}
      <button className="btn" disabled={pending}>{pending ? t("Sending...") : t("Send message")}</button>
    </form>
  );
}
