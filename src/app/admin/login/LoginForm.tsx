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
      <div className="adm-brand" style={{ padding: 0, color: "#14151a" }}><i /> Sparkthunder admin</div>
      <Field label="Email"><input className="adm-in" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><input className="adm-in" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <button className="adm-btn adm-pri" disabled={pending} style={{ justifyContent: "center" }}>{pending ? "Signing in..." : "Sign in"}</button>
      {toast}
    </form>
  );
}
