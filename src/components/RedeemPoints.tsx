"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemPointsAction } from "@/app/(shop)/account/rewards";
import { formatPrice } from "@/lib/site";

export function RedeemPoints({ balance, options }: { balance: number; options: { points: number; pence: number }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null);
  async function go(i: number) {
    setBusy(true); setRes(null);
    const r = await redeemPointsAction(i);
    setBusy(false);
    setRes(r.ok ? { ok: true, text: `Your code is ${r.code}. It takes ${formatPrice(r.pence)} off your basket at checkout, one use, valid for 90 days.` } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  }
  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {options.map((o, i) => (
          <li key={o.points}><button className="btn btn-ink" disabled={busy || balance < o.points} onClick={() => go(i)}>{formatPrice(o.pence)} off <span className="opacity-70">({o.points} points)</span></button></li>
        ))}
      </ul>
      {res ? <p role={res.ok ? "status" : "alert"} className="mt-4 max-w-xl font-bold">{res.text}</p> : null}
    </div>
  );
}
