"use client";

import { useT } from "@/components/LocaleProvider";import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemPointsAction } from "@/app/(shop)/account/rewards";
import { formatPrice } from "@/lib/site";

export function RedeemPoints({ balance, options }: { balance: number; options: { points: number; pence: number }[] }) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null);
  async function go(i: number) {
    setBusy(true); setRes(null);
    const r = await redeemPointsAction(i);
    setBusy(false);
    setRes(r.ok ? { ok: true, text: t("Your code is {code}. It takes {amount} off your basket at checkout, one use, valid for 90 days.", { code: r.code, amount: formatPrice(r.pence) }) } : { ok: false, text: t(r.error) });
    if (r.ok) router.refresh();
  }
  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {options.map((o, i) => (
          <li key={o.points}><button className="btn btn-ink" disabled={busy || balance < o.points} onClick={() => go(i)}>{t("{amount} off", { amount: formatPrice(o.pence) })} <span className="opacity-70">{t("({n} points)", { n: o.points })}</span></button></li>
        ))}
      </ul>
      {res ? <p role={res.ok ? "status" : "alert"} className="mt-4 max-w-xl font-bold">{res.text}</p> : null}
    </div>
  );
}
