"use client";
import Link from "next/link";
import { useState } from "react";
import { issueGiftCardAction } from "../../../gift-actions";
import { Field, poundsToPence, useAction } from "../../../ui";
import { formatCode } from "@/lib/giftcards/format";
import { formatPrice } from "@/lib/site";
import type { GiftTheme } from "@/lib/giftcards/themes";

export function IssueForm({ store }: { store: { name: string; origin: string; prefix: string; themes: GiftTheme[] } }) {
  const [amount, setAmount] = useState("25.00");
  const [f, setF] = useState({ recipientName: "", recipientEmail: "", senderName: "", message: "", theme: "brand", source: "admin" as "admin" | "promo" | "purchase", orderRef: "", note: "", expiresAt: "" });
  const [made, setMade] = useState<{ id: string; code: string } | null>(null);
  const { pending, run, toast } = useAction();
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  if (made) {
    const code = formatCode(made.code, store.prefix);
    const text = `Hi${f.recipientName ? ` ${f.recipientName}` : ""},\n\n${f.senderName || "Someone"} has sent you a ${formatPrice(poundsToPence(amount))} ${store.name} gift card.\n${f.message ? `\n"${f.message}"\n` : ""}\nYour code: ${code}\n\nEnter it at checkout at ${store.origin} to spend it. You can check the balance any time at ${store.origin}/gift-cards/balance.\n`;
    return (
      <>
        <div className="adm-h"><div><h1>Gift card created</h1><p>There is no email service connected yet, so copy this message and send it yourself.</p></div></div>
        <section className="adm-card">
          <div className="adm-lbl">Code</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: ".04em", marginBottom: 14 }}><code>{code}</code></div>
          <div className="adm-lbl">Message to send</div>
          <textarea className="adm-ta" style={{ minHeight: 200, fontFamily: "inherit" }} readOnly value={text} onFocus={(e) => e.target.select()} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="adm-btn adm-pri" onClick={() => navigator.clipboard?.writeText(text)}>Copy message</button>
            {f.recipientEmail ? <a className="adm-btn" href={`mailto:${f.recipientEmail}?subject=${encodeURIComponent(`Your ${store.name} gift card`)}&body=${encodeURIComponent(text)}`}>Open in email app</a> : null}
            <Link className="adm-btn" href={`/admin/gift-cards/${made.id}`}>View card</Link>
            <Link className="adm-btn" href="/admin/gift-cards/new" onClick={() => { setMade(null); }}>Issue another</Link>
          </div>
        </section>
      </>
    );
  }
  return (
    <>
      <div className="adm-h"><div><h1>Issue a gift card</h1><p><Link href="/admin/gift-cards">All gift cards</Link></p></div></div>
      <section className="adm-card"><h2>Value</h2>
        <div className="adm-grid adm-g3">
          <Field label="Amount (£)" hint="£5 to £250"><input className="adm-in" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Source"><select className="adm-sel" value={f.source} onChange={(e) => set("source", e.target.value)}><option value="admin">Issued by me</option><option value="promo">Promotion or giveaway</option><option value="purchase">Paid for elsewhere</option></select></Field>
          <Field label="Expires (optional)"><input className="adm-in" type="date" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></Field>
        </div>
      </section>
      <section className="adm-card"><h2>Recipient</h2>
        <div className="adm-grid adm-g2">
          <Field label="Recipient name"><input className="adm-in" value={f.recipientName} onChange={(e) => set("recipientName", e.target.value)} /></Field>
          <Field label="Recipient email"><input className="adm-in" type="email" value={f.recipientEmail} onChange={(e) => set("recipientEmail", e.target.value)} /></Field>
          <Field label="From (sender name)"><input className="adm-in" value={f.senderName} onChange={(e) => set("senderName", e.target.value)} /></Field>
          <Field label="Order or payment reference"><input className="adm-in" value={f.orderRef} onChange={(e) => set("orderRef", e.target.value)} /></Field>
        </div>
        <div className="adm-grid" style={{ marginTop: 14 }}>
          <Field label="Design"><select className="adm-sel" value={f.theme} onChange={(e) => set("theme", e.target.value)}>{store.themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
          <Field label="Message"><textarea className="adm-ta" style={{ minHeight: 70 }} maxLength={200} value={f.message} onChange={(e) => set("message", e.target.value)} /></Field>
          <Field label="Internal note (never shown to the recipient)"><input className="adm-in" value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
        </div>
      </section>
      <div className="adm-sticky"><button className="adm-btn adm-pri" disabled={pending} onClick={() => run(() => issueGiftCardAction({ amountPence: poundsToPence(amount), ...f, expiresAt: f.expiresAt || null }), "Created", (r) => setMade({ id: r.id, code: r.code }))}>{pending ? "Creating..." : "Create gift card"}</button>{toast}</div>
    </>
  );
}
