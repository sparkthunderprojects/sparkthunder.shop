"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginAction } from "../actions";
import { Field, useAction } from "../ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pending, run, toast } = useAction();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => loginAction(email, password), "Signed in", () => { router.push("/admin"); router.refresh(); }); }}>
      <div className="adm-login-logo"><i aria-hidden>⚡</i> Spark Merchant</div>
      <div><h1>Log in</h1></div>
      <p className="adm-login-sub">Continue to your stores</p>
      <Field label="Email"><input className="adm-in" type="email" autoComplete="username" autoFocus placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><input className="adm-in" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <button className="adm-btn adm-pri" disabled={pending} style={{ justifyContent: "center" }}>{pending ? "Logging in..." : "Log in"}</button>
      {toast}
    </form>
  );
}
