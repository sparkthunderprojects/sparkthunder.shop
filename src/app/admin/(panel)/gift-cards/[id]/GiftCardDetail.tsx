"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { emailGiftCardAction } from "../../../order-actions";
import { changeGiftCardBalanceAction, setGiftCardStatusAction, updateGiftCardDetailsAction } from "../../../gift-actions";
import { Field, poundsToPence, useAction } from "../../../ui";
import type { GiftCard, LedgerEntry } from "@/lib/giftcards/ledger";
import { effectiveStatus, formatCode } from "@/lib/giftcards/format";
import { formatPrice } from "@/lib/site";

export function GiftCardDetail({ card, ledger, prefix }: { card: GiftCard; ledger: LedgerEntry[]; prefix: string }) {
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const [kind, setKind] = useState<"redeem" | "refund" | "adjust">("redeem");
  const [amt, setAmt] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [d, setD] = useState({ recipientName: card.recipient_name, recipientEmail: card.recipient_email, senderName: card.sender_name, message: card.message, note: card.note, expiresAt: card.expires_at ? card.expires_at.slice(0, 10) : "" });
  const status = effectiveStatus(card);
  const refresh = () => router.refresh();
  const sign = kind === "adjust" ? "Use + to add, - to take off. " : "";

  return (
    <>
      <div className="adm-h"><div><h1><code>{formatCode(card.code, prefix)}</code></h1><p><Link href="/admin/gift-cards">All gift cards</Link> · Issued {new Date(card.created_at).toLocaleDateString("en-GB")} · {card.source} · {card.emailed_at ? `emailed ${new Date(card.emailed_at).toLocaleDateString("en-GB")}` : "not emailed yet"}</p></div>
        <span className={`adm-badge ${status === "active" ? "adm-ok" : status === "used" ? "" : status === "expired" ? "adm-warn" : "adm-bad"}`}>{status}</span></div>
      <div className="adm-grid adm-g3" style={{ marginBottom: 18 }}>
        <div className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{formatPrice(card.balance_pence)}</div><div className="adm-stat-l">Balance</div></div>
        <div className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{formatPrice(card.initial_pence)}</div><div className="adm-stat-l">Original value</div></div>
        <div className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{card.expires_at ? new Date(card.expires_at).toLocaleDateString("en-GB") : "Never"}</div><div className="adm-stat-l">Expires</div></div>
      </div>

      <section className="adm-card"><h2>Take payment, refund or adjust</h2>
        <div className="adm-grid" style={{ gridTemplateColumns: "1.2fr 1fr 1.4fr 2fr auto", alignItems: "end" }}>
          <Field label="Action"><select className="adm-sel" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="redeem">Spend (take off balance)</option><option value="refund">Refund (add back)</option><option value="adjust">Adjust (correction)</option></select></Field>
          <Field label="Amount (£)"><input className="adm-in" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
          <Field label="Order reference"><input className="adm-in" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          <Field label={kind === "adjust" ? "Reason (required)" : "Note"}><input className="adm-in" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <button className="adm-btn adm-pri" disabled={pending || !amt} onClick={() => {
            const neg = amt.trim().startsWith("-"); const p = poundsToPence(amt.replace("-", ""));
            run(() => changeGiftCardBalanceAction(card.id, kind === "adjust" && neg ? -p : p, kind, ref, note), "Balance updated", () => { setAmt(""); setNote(""); setRef(""); refresh(); });
          }}>Apply</button>
        </div>
        {sign ? <div className="adm-hint">{sign}</div> : null}{toast}
      </section>

      <section className="adm-card"><h2>Details</h2>
        <div className="adm-grid adm-g2">
          <Field label="Recipient name"><input className="adm-in" value={d.recipientName} onChange={(e) => setD({ ...d, recipientName: e.target.value })} /></Field>
          <Field label="Recipient email"><input className="adm-in" type="email" value={d.recipientEmail} onChange={(e) => setD({ ...d, recipientEmail: e.target.value })} /></Field>
          <Field label="From"><input className="adm-in" value={d.senderName} onChange={(e) => setD({ ...d, senderName: e.target.value })} /></Field>
          <Field label="Expires"><input className="adm-in" type="date" value={d.expiresAt} onChange={(e) => setD({ ...d, expiresAt: e.target.value })} /></Field>
        </div>
        <div className="adm-grid" style={{ marginTop: 14 }}>
          <Field label="Message"><textarea className="adm-ta" style={{ minHeight: 70 }} value={d.message} onChange={(e) => setD({ ...d, message: e.target.value })} /></Field>
          <Field label="Internal note"><input className="adm-in" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button className="adm-btn adm-pri" disabled={pending} onClick={() => run(() => updateGiftCardDetailsAction(card.id, d), "Saved", refresh)}>Save details</button>
          <button className="adm-btn" onClick={() => navigator.clipboard?.writeText(formatCode(card.code, prefix))}>Copy code</button>
          <button className="adm-btn adm-bolt" disabled={pending || !d.recipientEmail} onClick={() => run(() => emailGiftCardAction(card.id, d.recipientEmail), "Email sent", refresh)}>{card.emailed_at ? "Email again" : "Email to recipient"}</button>
          {card.status === "active"
            ? <button className="adm-btn adm-danger" disabled={pending} onClick={() => { const why = prompt("Why are you disabling this card? (optional)") ?? null; if (why !== null) run(() => setGiftCardStatusAction(card.id, "disabled", why), "Disabled", refresh); }}>Disable card</button>
            : <button className="adm-btn" disabled={pending} onClick={() => run(() => setGiftCardStatusAction(card.id, "active", ""), "Re-enabled", refresh)}>Re-enable card</button>}
        </div>
      </section>

      <section className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <h2 style={{ padding: "20px 20px 0" }}>History</h2>
        <table className="adm-table"><thead><tr><th>When</th><th>Type</th><th>Amount</th><th>Balance after</th><th>Order</th><th>Note</th><th>By</th></tr></thead><tbody>
          {ledger.map((l) => (
            <tr key={l.id}><td>{new Date(l.created_at).toLocaleString("en-GB")}</td><td><span className="adm-badge">{l.kind}</span></td>
              <td style={{ color: l.delta_pence < 0 ? "#c0392b" : l.delta_pence > 0 ? "#12805c" : undefined, fontWeight: 700 }}>{l.delta_pence === 0 ? "-" : `${l.delta_pence > 0 ? "+" : "-"}${formatPrice(Math.abs(l.delta_pence))}`}</td>
              <td>{formatPrice(l.balance_after)}</td><td>{l.order_ref}</td><td className="adm-hint">{l.note}</td><td className="adm-hint">{l.created_by}</td></tr>
          ))}
        </tbody></table>
      </section>
    </>
  );
}
