"use client";

import { useT } from "@/components/LocaleProvider";
import { localePath } from "@/lib/i18n/config";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/db/browser";

export function ResetForm() {
  const router = useRouter();
  const { t, locale } = useT();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="mt-8 max-w-md space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      if (pw.length < 8) return setMsg(t("Use at least 8 characters."));
      setBusy(true);
      const { error } = (await browserClient()?.auth.updateUser({ password: pw })) ?? { error: new Error("x") };
      setBusy(false);
      if (error) return setMsg(t("We could not update your password. The link may have expired: request a new one from the sign-in page."));
      router.push(localePath("/account", locale) as never);
    }}>
      <div><label htmlFor="np" className="text-sm font-bold">{t("New password")}</label><input id="np" type="password" autoComplete="new-password" className="w-full border border-ink/20 bg-paper px-3 py-3" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <button className="btn w-full" disabled={busy}>{busy ? t("Saving...") : t("Save password")}</button>
      {msg ? <p role="alert" className="font-bold text-red-700">{msg}</p> : null}
    </form>
  );
}
