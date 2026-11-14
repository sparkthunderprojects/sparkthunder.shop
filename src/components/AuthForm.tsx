"use client";

import { useT } from "@/components/LocaleProvider";
import { localePath } from "@/lib/i18n/config";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { browserClient } from "@/lib/db/browser";

type Mode = "signin" | "signup" | "forgot";
const input = "w-full border border-ink/20 bg-paper px-3 py-3 focus:border-ink";

export function AuthForm({ next, configured, linkError }: { next: string; configured: boolean; linkError: boolean }) {
  const router = useRouter();
  const { t, locale } = useT();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(linkError ? { ok: false, text: t("That link has expired or was already used. Please try again.") } : null);
  const uid = useId();

  if (!configured) {
    return <p className="mt-8 max-w-lg border border-ink/20 bg-paper-2 p-5 text-muted">{t("Sparkthunder ID sign-in is being switched on. Please check back soon.")}</p>;
  }
  const callback = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    setMsg(null);
    const { error } = await browserClient()!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) setMsg({ ok: false, text: t("Google sign-in is not available right now. Use your email instead.") });
  }

  // My Sparkthunder is the optional shared Sparkthunder account (mysparkthunder.com), connected to this project
  // as the custom sign-in provider "custom:my-sparkthunder". Set NEXT_PUBLIC_MY_SPARKTHUNDER_PROVIDER to "off" to hide it.
  const mySparkthunder = process.env.NEXT_PUBLIC_MY_SPARKTHUNDER_PROVIDER === "off" ? null : process.env.NEXT_PUBLIC_MY_SPARKTHUNDER_PROVIDER || "custom:my-sparkthunder";
  async function sparkthunder() {
    if (!mySparkthunder) return;
    setMsg(null);
    const { error } = await browserClient()!.auth.signInWithOAuth({ provider: mySparkthunder as "google", options: { redirectTo: callback() } });
    if (error) setMsg({ ok: false, text: t("My Sparkthunder sign-in is not available right now. Use Google or your email instead.") });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setBusy(true);
    const sb = browserClient()!;
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return setMsg({ ok: false, text: /confirm/i.test(error.message) ? t("Please confirm your email first. Check your inbox for the link.") : t("That email and password did not match.") });
        router.push(localePath(next, locale) as never); router.refresh();
      } else if (mode === "signup") {
        if (password.length < 8) return setMsg({ ok: false, text: t("Use a password of at least 8 characters.") });
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: callback(), data: { full_name: name.trim() } } });
        if (error) return setMsg({ ok: false, text: error.message.includes("already") ? t("There is already an account with that email. Try signing in.") : t("We could not create your account. Please try again.") });
        if (data.session) { router.push(localePath(next, locale) as never); router.refresh(); }
        else setMsg({ ok: true, text: t("Check your email for a confirmation link to finish creating your Sparkthunder ID.") });
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/account/reset")}` });
        if (error) return setMsg({ ok: false, text: t("We could not send that email right now. Please try again.") });
        setMsg({ ok: true, text: t("If there is an account for that email, a reset link is on its way.") });
      }
    } finally { setBusy(false); }
  }

  const tab = (m: Mode, label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setMsg(null); }} className={`border-b-4 px-1 pb-2 font-bold ${mode === m ? "border-bolt" : "border-transparent text-muted hover:text-ink"}`}>{label}</button>
  );
  return (
    <div className="mt-8 max-w-md">
      <div role="tablist" aria-label={t("Account")} className="flex gap-6">{tab("signin", t("Sign in"))}{tab("signup", t("Create account"))}</div>
      {mode !== "forgot" ? (
        <>
          {mySparkthunder ? (
            <div className="mt-6">
              <button type="button" onClick={sparkthunder} aria-label={t("Continue with My Sparkthunder")} data-testid="my-sparkthunder" className="flex h-14 w-full items-center justify-center border-2 border-ink bg-ink px-4 hover:opacity-90">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/my-sparkthunder-logo.webp" alt="My Sparkthunder" width={407} height={93} className="h-9 w-auto" />
              </button>
              <p className="mt-2 text-center text-sm text-muted">{t("One account for every Sparkthunder site. Optional: Google or email work too.")}</p>
            </div>
          ) : null}
          <button type="button" onClick={google} className={`${mySparkthunder ? "mt-4" : "mt-6"} flex w-full items-center justify-center gap-3 border-2 border-ink px-4 py-3 font-bold hover:bg-paper-2`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" /></svg>
            {t("Continue with Google")}
          </button>
          <p className="my-4 text-center text-sm text-muted">{t("or use your email")}</p>
        </>
      ) : <p className="mt-6 text-muted">{t("Enter your email and we will send you a link to choose a new password.")}</p>}
      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" ? <div><label htmlFor={`${uid}-n`} className="text-sm font-bold">{t("Your name")}</label><input id={`${uid}-n`} className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} /></div> : null}
        <div><label htmlFor={`${uid}-e`} className="text-sm font-bold">{t("Email")}</label><input id={`${uid}-e`} type="email" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        {mode !== "forgot" ? <div><label htmlFor={`${uid}-p`} className="text-sm font-bold">{t("Password")}</label><input id={`${uid}-p`} type="password" required minLength={mode === "signup" ? 8 : undefined} className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          {mode === "signin" ? <button type="button" onClick={() => { setMode("forgot"); setMsg(null); }} className="mt-1 text-sm underline underline-offset-4">{t("Forgot your password?")}</button> : <p className="mt-1 text-sm text-muted">{t("At least 8 characters.")}</p>}</div> : null}
        <button className="btn w-full" disabled={busy}>{busy ? t("One moment...") : mode === "signin" ? t("Sign in") : mode === "signup" ? t("Create my Sparkthunder ID") : t("Send reset link")}</button>
        {mode === "forgot" ? <button type="button" onClick={() => setMode("signin")} className="text-sm underline underline-offset-4">{t("Back to sign in")}</button> : null}
      </form>
      <div aria-live="polite">{msg ? <p role={msg.ok ? "status" : "alert"} className={`mt-4 font-bold ${msg.ok ? "text-green-800" : "text-red-700"}`}>{msg.text}</p> : null}</div>
    </div>
  );
}
