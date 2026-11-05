"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="adm-lbl">{label}</span>
      {children}
      {hint ? <div className="adm-hint">{hint}</div> : null}
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 4, width: 16, height: 16 }} />
      <span><b>{label}</b>{hint ? <span className="adm-hint" style={{ display: "block", marginTop: 0 }}>{hint}</span> : null}</span>
    </label>
  );
}

/** Wraps a server action call with pending state and a toast message. */
export function useAction() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function run<T extends { ok: boolean }>(fn: () => Promise<T>, okText: string, after?: (r: Extract<T, { ok: true }>) => void) {
    start(async () => {
      const r = (await fn()) as T & { error?: string };
      if (r.ok) { setMsg({ ok: true, text: okText }); after?.(r as Extract<T, { ok: true }>); }
      else setMsg({ ok: false, text: r.error ?? "Something went wrong." });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), 6000);
    });
  }
  const toast = msg ? <span role="status" className={`adm-toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</span> : null;
  return { pending, run, toast };
}

export const poundsToPence = (v: string) => Math.round((parseFloat(v.replace(/[^0-9.]/g, "")) || 0) * 100);
export const penceToPounds = (p: number | undefined) => (p === undefined ? "" : (p / 100).toFixed(2));
