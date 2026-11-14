"use client";

import { useT } from "@/components/LocaleProvider";
import { useState } from "react";

export const SUBSCRIBED_KEY = "sparkthunder-subscribed-v1";

/** Email sign-up form shared by the footer banner and the popup. */
export function SubscribeForm({ idPrefix, doneClass = "serif text-2xl font-semibold", onDone }: { idPrefix: string; doneClass?: string; onDone?: () => void }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const { t } = useT();
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setState("sending");
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState("done"); setMessage(t("You’re on the list. We’ll email you when new merchandise drops."));
        try { localStorage.setItem(SUBSCRIBED_KEY, "1"); } catch {}
        onDone?.();
      } else { setState("error"); setMessage(t(data.error ?? "Something went wrong. Please try again.")); }
    } catch {
      setState("error"); setMessage(t("Couldn’t reach the server. Please try again."));
    }
  }

  if (state === "done") return <p role="status" className={doneClass}>{message}</p>;
  return (
    <>
      <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-3 sm:flex-row" noValidate>
        <label htmlFor={`${idPrefix}-email`} className="sr-only">{t("Email address")}</label>
        <input id={`${idPrefix}-email`} name="email" type="email" required autoComplete="email" placeholder={t("Your email address")} className="flex-1 border border-ink/20 bg-paper px-4 py-3.5" />
        <button disabled={state === "sending"} className="btn btn-ink">{state === "sending" ? t("Joining…") : t("Join the list")}</button>
      </form>
      {state === "error" && <p role="alert" className="mt-3 font-bold">{message}</p>}
    </>
  );
}
