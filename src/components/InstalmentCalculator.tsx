"use client";

import { useT } from "@/components/LocaleProvider";import { useState } from "react";
import { splitInstalments } from "@/lib/pay-later";

const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;

/** "See how your basket would split": type a total, see each payment. An illustration only: the provider confirms the real schedule at checkout. */
export function InstalmentCalculator({ name, schedule, note, accent }: { name: string; schedule: string[]; note: string; accent: string }) {
  const [text, setText] = useState("60");
  const { t } = useT();
  const pounds = Number(text.replace(/[^0-9.]/g, ""));
  const total = Number.isFinite(pounds) ? Math.min(Math.round(pounds * 100), 500000) : 0;
  const parts = splitInstalments(total, schedule.length);
  return (
    <div className="border border-ink/15 p-6 sm:p-8" data-paycalc>
      <label className="block text-sm font-bold" htmlFor="paycalc-amount">{t("Your basket total")}</label>
      <div className="mt-2 flex items-center gap-2"><span className="text-2xl font-extrabold" aria-hidden>£</span><input id="paycalc-amount" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} className="w-40 border border-ink/25 bg-transparent px-3 py-2 text-2xl font-extrabold" /></div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-[repeat(var(--n),1fr)]" style={{ ["--n" as string]: schedule.length }} aria-label={t("{name} example payments", { name })}>
        {schedule.map((label, i) => (
          <li key={label} className="p-4 text-black" style={{ background: accent }}>
            <span className="block text-xs font-bold uppercase tracking-widest opacity-70">{t(label)}</span>
            <span className="mt-1 block text-2xl font-extrabold" data-paycalc-part>{gbp(parts[i])}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted">{t(note)} {t("This is an example, not an offer.")}</p>
    </div>
  );
}
