"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markShippedAction, updateOrderAction } from "../../../order-actions";
import { Field, useAction } from "../../../ui";
import type { OrderRow } from "@/lib/shop/fulfil";
import { formatPrice } from "@/lib/site";

export function OrderDetail({ order: o }: { order: OrderRow }) {
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const [carrier, setCarrier] = useState(o.tracking_carrier || "Royal Mail");
  const [tracking, setTracking] = useState(o.tracking_number ?? "");
  const [status, setStatus] = useState(o.status);
  const [notes, setNotes] = useState(o.notes ?? "");
  const a = o.shipping_address;
  const hasPhysical = o.items.some((l) => l.type === "product");
  return (
    <>
      <div className="adm-h"><div><h1>{o.number}</h1><p><Link href="/admin/orders">All orders</Link> · {new Date(o.created_at).toLocaleString("en-GB")}</p></div>
        <span className={`adm-badge ${o.status === "shipped" ? "adm-ok" : o.status === "attention" ? "adm-bad" : o.status === "paid" ? "adm-warn" : ""}`}>{o.status}</span></div>

      {o.attention_reason ? <section className="adm-card" style={{ borderColor: "#c0392b" }}><h2 style={{ color: "#c0392b" }}>Needs your attention</h2><p style={{ whiteSpace: "pre-line", margin: 0 }}>{o.attention_reason}</p>
        <button className="adm-btn" style={{ marginTop: 12 }} disabled={pending} onClick={() => run(() => updateOrderAction(o.id, { status: o.status === "attention" ? "paid" : o.status, notes }), "Marked as handled", () => router.refresh())}>Mark as handled</button></section> : null}

      <div className="adm-grid adm-g2">
        <section className="adm-card"><h2>Items</h2>
          <table className="adm-table"><tbody>
            {o.items.map((l, i) => <tr key={i}><td>{l.name}{l.type === "product" ? <div className="adm-hint">{l.sku}</div> : <div className="adm-hint">Gift card to {l.gift.recipientEmail}</div>}</td><td>× {l.qty}</td><td align="right">{formatPrice(l.unitPence * l.qty)}</td></tr>)}
            <tr><td colSpan={2} className="adm-hint">Shipping</td><td align="right">{formatPrice(o.shipping_pence)}</td></tr>
            {o.gift_card_pence ? <tr><td colSpan={2} className="adm-hint">Gift card {o.gift_card_code ? <Link href="/admin/gift-cards">({o.gift_card_code.slice(0, 4)}…)</Link> : null}</td><td align="right">-{formatPrice(o.gift_card_pence)}</td></tr> : null}
            <tr><td colSpan={2}><b>Paid by card</b></td><td align="right"><b>{formatPrice(o.total_pence)}</b></td></tr>
          </tbody></table>
        </section>
        <section className="adm-card"><h2>Customer</h2>
          <p style={{ margin: "0 0 10px" }}><b>{o.name}</b><br /><a href={`mailto:${o.email}`}>{o.email}</a>{o.phone ? <><br />{o.phone}</> : null}</p>
          {a ? <p style={{ margin: 0 }}>{Object.values(a).filter(Boolean).map((v, i) => <span key={i}>{v}<br /></span>)}</p> : <p className="adm-hint">No shipping address (digital order).</p>}
          {o.stripe_payment_intent && o.stripe_payment_intent !== "pi_demo" ? <p className="adm-hint" style={{ marginTop: 10 }}><a href={`https://dashboard.stripe.com/payments/${o.stripe_payment_intent}`} target="_blank" rel="noreferrer">View payment in Stripe</a></p> : null}
        </section>
      </div>

      {hasPhysical ? <section className="adm-card"><h2>Shipping</h2>
        <div className="adm-grid" style={{ gridTemplateColumns: "1fr 2fr auto", alignItems: "end" }}>
          <Field label="Carrier"><input className="adm-in" value={carrier} onChange={(e) => setCarrier(e.target.value)} /></Field>
          <Field label="Tracking number"><input className="adm-in" value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
          <button className="adm-btn adm-bolt" disabled={pending} onClick={() => run(() => markShippedAction(o.id, carrier, tracking), o.status === "shipped" ? "Updated" : "Marked as shipped", () => router.refresh())}>{o.status === "shipped" ? "Update and re-email" : "Mark shipped and email customer"}</button>
        </div>{o.shipped_at ? <div className="adm-hint">Shipped {new Date(o.shipped_at).toLocaleString("en-GB")}</div> : null}</section> : null}

      <section className="adm-card"><h2>Internal</h2>
        <div className="adm-grid adm-g2">
          <Field label="Status"><select className="adm-sel" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="paid">To ship / paid</option><option value="shipped">Shipped</option><option value="attention">Needs attention</option><option value="cancelled">Cancelled</option></select></Field>
          <Field label="Notes"><input className="adm-in" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <button className="adm-btn adm-pri" style={{ marginTop: 12 }} disabled={pending} onClick={() => run(() => updateOrderAction(o.id, { status, notes }), "Saved", () => router.refresh())}>Save</button> {toast}
      </section>
    </>
  );
}
