"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { GIFT_AMOUNTS, GIFT_MAX, GIFT_MESSAGE_MAX, GIFT_MIN, clampGift } from "@/lib/giftcards";
import { formatPrice } from "@/lib/site";
import type { GiftTheme } from "@/lib/giftcards/themes";

export type DesignerStore = { name: string; logoUrl: string; logoWidth: number; logoHeight: number; themes: GiftTheme[] };

export function GiftCardDesigner({ store }: { store: DesignerStore }) {
  const THEMES = store.themes;
  const { add } = useCart();
  const [amount, setAmount] = useState<number>(2500);
  const [custom, setCustom] = useState("");
  const [theme, setTheme] = useState<GiftTheme>(store.themes[0]);
  const [to, setTo] = useState("");
  const [email, setEmail] = useState("");
  const [from, setFrom] = useState("");
  const [msg, setMsg] = useState("");
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const uid = useId();

  const customPence = custom ? Math.round(parseFloat(custom) * 100) : NaN;
  const value = custom ? (Number.isFinite(customPence) ? clampGift(customPence) : GIFT_MIN) : amount;
  const customBad = custom !== "" && (!Number.isFinite(customPence) || customPence < GIFT_MIN || customPence > GIFT_MAX);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (customBad) return setError(`Choose an amount between ${formatPrice(GIFT_MIN)} and ${formatPrice(GIFT_MAX)}.`);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter the email address the gift card should be sent to.");
    setError("");
    const key = Math.abs([...`${email}|${to}|${from}|${msg}|${theme.id}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36);
    add({
      slug: `gift-card-${value}-${key}`, name: `${store.name} gift card ${formatPrice(value)}`, pricePence: value, image: store.logoUrl,
      href: "/gift-cards/send", gift: { recipientName: to.trim(), recipientEmail: email.trim(), senderName: from.trim(), message: msg.trim(), theme: theme.id },
      note: `For ${to.trim() || email}${from.trim() ? ` from ${from.trim()}` : ""} (${email})`,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const input = "w-full border border-ink/20 bg-paper px-3 py-2.5 focus:border-ink";
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
      <div className="lg:sticky lg:top-40">
        <div
          role="img"
          aria-label={`Preview of a ${formatPrice(value)} ${store.name} gift card`}
          className="relative aspect-[1.586/1] w-full overflow-hidden p-6 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)] sm:p-8"
          style={{ background: theme.bg, borderRadius: 20 }}
        >
          <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rotate-12 opacity-25" style={{ background: `conic-gradient(from 200deg, ${theme.accent}, transparent 40%)`, borderRadius: "50%" }} />
          {store.logoUrl ? <Image src={store.logoUrl} alt="" width={store.logoWidth} height={store.logoHeight} unoptimized className="relative h-9 w-auto sm:h-12" /> : <p className="display relative text-2xl sm:text-3xl">{store.name}</p>}
          <p className="relative mt-1 text-xs font-bold uppercase tracking-[0.35em]" style={{ color: theme.accent }}>Gift card</p>
          <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 sm:inset-x-8 sm:bottom-8">
            <div className="min-w-0">
              {to.trim() ? <p className="truncate text-sm text-white/70">For {to.trim()}</p> : null}
              {msg.trim() ? <p className="mt-1 line-clamp-2 max-w-[22ch] text-sm italic text-white/85 sm:max-w-[30ch]">&ldquo;{msg.trim()}&rdquo;</p> : null}
              {from.trim() ? <p className="mt-1 truncate text-sm text-white/70">From {from.trim()}</p> : null}
            </div>
            <p className="display shrink-0 text-4xl sm:text-5xl" style={{ color: theme.accent }}>{formatPrice(value).replace(".00", "")}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">Preview only. The emailed card shows your message, amount and a unique code.</p>
      </div>

      <form onSubmit={submit} className="space-y-8" noValidate>
        <fieldset>
          <legend className="font-bold">Amount</legend>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GIFT_AMOUNTS.map((a) => (
              <button key={a} type="button" aria-pressed={!custom && amount === a} onClick={() => { setAmount(a); setCustom(""); setError(""); }}
                className={`border-2 px-3 py-3 text-lg font-bold transition-colors ${!custom && amount === a ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"}`}>
                {formatPrice(a).replace(".00", "")}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-sm font-bold" htmlFor={`${uid}-custom`}>Or enter your own amount</label>
          <div className="mt-1 flex max-w-xs items-center border border-ink/20 focus-within:border-ink">
            <span className="pl-3 font-bold" aria-hidden>£</span>
            <input id={`${uid}-custom`} inputMode="decimal" placeholder={`${GIFT_MIN / 100} to ${GIFT_MAX / 100}`} value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))} aria-invalid={customBad} className="w-full bg-transparent px-2 py-2.5 outline-none" />
          </div>
          {customBad ? <p className="mt-1 text-sm text-red-700" role="alert">Between {formatPrice(GIFT_MIN)} and {formatPrice(GIFT_MAX)}.</p> : null}
        </fieldset>

        <fieldset>
          <legend className="font-bold">Design</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {THEMES.map((t) => (
              <button key={t.id} type="button" aria-pressed={theme.id === t.id} onClick={() => setTheme(t)}
                className={`flex items-center gap-2 border-2 px-3 py-2 font-bold ${theme.id === t.id ? "border-ink" : "border-ink/20 hover:border-ink"}`}>
                <span aria-hidden className="h-5 w-5 rounded-full border border-black/20" style={{ background: t.accent }} />{t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-bold">Who is it for?</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="text-sm font-bold" htmlFor={`${uid}-to`}>Their name</label><input id={`${uid}-to`} className={input} value={to} maxLength={40} onChange={(e) => setTo(e.target.value)} /></div>
            <div><label className="text-sm font-bold" htmlFor={`${uid}-from`}>Your name</label><input id={`${uid}-from`} className={input} value={from} maxLength={40} onChange={(e) => setFrom(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-bold" htmlFor={`${uid}-email`}>Send to this email</label><input id={`${uid}-email`} type="email" autoComplete="off" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="mt-1 text-sm text-muted">Use your own address if you would rather forward it yourself.</p></div>
          <div><label className="text-sm font-bold" htmlFor={`${uid}-msg`}>Message (optional)</label><textarea id={`${uid}-msg`} rows={3} maxLength={GIFT_MESSAGE_MAX} className={input} value={msg} onChange={(e) => setMsg(e.target.value)} />
            <p className="mt-1 text-right text-xs text-muted">{msg.length}/{GIFT_MESSAGE_MAX}</p></div>
        </fieldset>

        {error ? <p role="alert" className="font-bold text-red-700">{error}</p> : null}
        <button className="btn w-full" aria-live="polite">{added ? "Added to basket" : `Add ${formatPrice(value)} gift card to basket`}</button>
      </form>
    </div>
  );
}
