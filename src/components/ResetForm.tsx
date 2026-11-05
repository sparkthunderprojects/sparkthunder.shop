"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/db/browser";

export function ResetForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="mt-8 max-w-md space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      if (pw.length < 8) return setMsg("Use at least 8 characters.");
      setBusy(true);
      const { error } = (await browserClient()?.auth.updateUser({ password: pw })) ?? { error: new Error("x") };
      setBusy(false);
      if (error) return setMsg("We could not update your password. The link may have expired: request a new one from the sign-in page.");
      router.push("/account");
    }}>
      <div><label htmlFor="np" className="text-sm font-bold">New password</label><input id="np" type="password" autoComplete="new-password" className="w-full border border-ink/20 bg-paper px-3 py-3" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <button className="btn w-full" disabled={busy}>{busy ? "Saving..." : "Save password"}</button>
      {msg ? <p role="alert" className="font-bold text-red-700">{msg}</p> : null}
    </form>
  );
}
