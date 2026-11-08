"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { refundOrderAction, retryRefundAction } from "../../../order-actions";
import { Field, Toggle, useAction } from "../../../ui";
import type { OrderRow } from "@/lib/shop/fulfil";
import type { RefundRow } from "@/lib/shop/refund";
import { formatPrice } from "@/lib/site";

const pounds = (p: number) => (p / 100).toFixed(2);
const toPence = (s: string) => Math.round(Number(s.replace(/[^0-9.]/g, "")) * 100) || 0;

export function RefundPanel({ order: o, refunds }: { order: OrderRow; refunds: RefundRow[] }) {
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const cardLeft = o.total_pence - (o.refunded_card_pence ?? 0), giftLeft = o.gift_card_pence - (o.refunded_gift_pence ?? 0);
  const [card, setCard] = useState(pounds(cardLeft)), [gift, setGift] = useState(pounds(giftLeft));
  const [qty, setQty] = useState<Record<number, number>>({});
  const [points, setPoints] = useState(true), [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const pendingRefunds = refunds.filter((r) => r.status === "pending");
  const cardP = Math.min(cardLeft, toPence(card)), giftP = Math.min(giftLeft, toPence(gift));
  const nothingLeft = cardLeft <= 0 && giftLeft <= 0;

  function send() {
    const restock = Object.entries(qty).filter(([, q]) => q > 0).map(([line, q]) => ({ line: Number(line), qty: q }));
    run(() => refundOrderAction({ orderId: o.id, key, cardPence: cardP, giftPence: giftP, restock, takePoints: points, reason }), "Refunded", () => {
      setKey(crypto.randomUUID()); setConfirm(false); setQty({}); setReason(""); router.refresh();
    });
  }

  return (
    <section className="adm-card">
      <h2>Refunds</h2>
      {refunds.length ? (
        <table className="adm-table" style={{ marginBottom: 14 }}><tbody>
          {refunds.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleString("en-GB")}<div className="adm-hint">{r.source === "stripe" ? "Made in the Stripe dashboard" : `by ${r.created_by}`}{r.reason ? ` · ${r.reason}` : ""}</div></td>
              <td>{r.card_pence ? <>Card {formatPrice(r.card_pence)}<br /></> : null}{r.gift_pence ? <>Gift card {formatPrice(r.gift_pence)}</> : null}</td>
              <td align="right"><span className={`adm-badge ${r.status === "done" ? "adm-ok" : r.status === "failed" ? "adm-bad" : "adm-warn"}`}>{r.status === "pending" ? "unfinished" : r.status}</span>
                {r.status === "pending" ? <div><button className="adm-btn" disabled={pending} onClick={() => run(() => retryRefundAction(r.id), "Finished", () => router.refresh())}>Retry</button></div> : null}
                {r.status === "failed" && r.error ? <div className="adm-hint">{r.error}</div> : null}</td>
            </tr>
          ))}
        </tbody></table>
      ) : null}
      {pendingRefunds.length ? <p className="adm-hint" style={{ color: "#b7791f" }}>A refund has not finished. Press Retry on it above before starting another.</p> : null}

      {nothingLeft ? <p className="adm-hint">This order has been refunded in full.</p> : (
        <>
          <div className="adm-grid adm-g2">
            {cardLeft > 0 ? <Field label={`Refund to the card (up to ${formatPrice(cardLeft)})`} hint="Goes back to the customer's card through Stripe."><input className="adm-in" inputMode="decimal" value={card} onChange={(e) => { setCard(e.target.value); setConfirm(false); }} /></Field> : null}
            {giftLeft > 0 ? <Field label={`Refund to the gift card (up to ${formatPrice(giftLeft)})`} hint="Added straight back onto the gift card they used."><input className="adm-in" inputMode="decimal" value={gift} onChange={(e) => { setGift(e.target.value); setConfirm(false); }} /></Field> : null}
          </div>
          {o.items.some((l) => l.type === "product") ? (
            <fieldset style={{ border: 0, padding: 0, margin: "14px 0" }}>
              <legend className="adm-lbl">Put these back in stock</legend>
              {o.items.map((l, i) => l.type === "product" ? (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", margin: "4px 0" }}>
                  <select className="adm-sel" style={{ width: 70 }} aria-label={`Quantity of ${l.name} to restock`} value={qty[i] ?? 0} onChange={(e) => { setQty({ ...qty, [i]: Number(e.target.value) }); setConfirm(false); }}>
                    {Array.from({ length: l.qty + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>of {l.qty} × {l.name}</span>
                </div>
              ) : null)}
            </fieldset>
          ) : null}
          <div style={{ display: "grid", gap: 12, margin: "14px 0" }}>
            <Toggle label="Take back the Spark points they earned" checked={points} onChange={setPoints} hint="In proportion to the amount refunded." />
            <Field label="Reason (shown to the customer in the email)"><input className="adm-in" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} /></Field>
          </div>
          {!confirm
            ? <button className="adm-btn adm-pri" disabled={pending || pendingRefunds.length > 0 || cardP + giftP <= 0} onClick={() => setConfirm(true)}>Review refund</button>
            : <div role="alert" style={{ border: "2px solid #c0392b", padding: 12 }}>
                <b>Refund {cardP ? `${formatPrice(cardP)} to the card` : ""}{cardP && giftP ? " and " : ""}{giftP ? `${formatPrice(giftP)} to the gift card` : ""}?</b>
                <div className="adm-hint">The customer is emailed. This cannot be undone.</div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button className="adm-btn adm-pri" disabled={pending} onClick={send}>Yes, refund</button>
                  <button className="adm-btn" disabled={pending} onClick={() => setConfirm(false)}>Cancel</button>
                </div>
              </div>}
        </>
      )}
      {toast}
    </section>
  );
}
