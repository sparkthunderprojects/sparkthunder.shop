"use client";

import { useT } from "@/components/LocaleProvider";import { useEffect, useState } from "react";

/** Current time, ticking each second while `active`. */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Live countdown to a launch. Renders nothing once the moment has passed. */
export function Countdown({ to, label = "Launches in", className = "" }: { to: string; label?: string; className?: string }) {
  const target = Date.parse(to);
  const { t } = useT();
  const now = useNow(true);
  const left = Math.max(0, target - now);
  if (!Number.isFinite(target) || left === 0) return null;
  const s = Math.floor(left / 1000);
  const parts: [number, string][] = [[Math.floor(s / 86400), t("days")], [Math.floor((s % 86400) / 3600), t("hrs")], [Math.floor((s % 3600) / 60), t("min")], [s % 60, t("sec")]];
  const spoken = t("{d} days, {h} hours and {m} minutes", { d: parts[0][0], h: parts[1][0], m: parts[2][0] });
  return (
    <div className={className}>
      <p className="text-sm font-bold uppercase tracking-wide">{t(label)}</p>
      <p className="sr-only">{spoken}</p>
      <div aria-hidden suppressHydrationWarning className="mt-2 flex gap-3">
        {parts.map(([n, u]) => (
          <div key={u} className="min-w-14 border border-current/30 px-2 py-2 text-center">
            <div className="display text-2xl tabular-nums" suppressHydrationWarning>{pad(n)}</div>
            <div className="text-xs uppercase opacity-70">{u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
