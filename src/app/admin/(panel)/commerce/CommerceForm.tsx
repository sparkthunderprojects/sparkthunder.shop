"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCommerceAction, saveSecretsAction } from "../../commerce-actions";
import type { CommerceSettings } from "@/lib/commerce-config";

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label style={{ display: "grid", gap: 4 }}><span>{label}</span>{children}{hint ? <small style={{ opacity: 0.7 }}>{hint}</small> : null}</label>
);
const pounds = (p: number | null) => (p == null ? "" : (p / 100).toFixed(2));
const toPence = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));

export function CommerceForm({ commerce, status }: { commerce: CommerceSettings; status: { stripe: boolean; webhook: boolean; email: boolean; emailFrom: string } }) {
  const router = useRouter();
  const [ship, setShip] = useState(pounds(commerce.shippingFlatPence));
  const [free, setFree] = useState(pounds(commerce.freeShippingPence));
  const [wrap, setWrap] = useState(pounds(commerce.giftWrapPence));
  const [countries, setCountries] = useState(commerce.shippingCountries.join(", "));
  const [support, setSupport] = useState(commerce.supportEmail);
  const [msg, setMsg] = useState("");
  const [sk, setSk] = useState(""), [wh, setWh] = useState(""), [rk, setRk] = useState(""), [from, setFrom] = useState(status.emailFrom);
  const [pmsg, setPmsg] = useState("");

  const saveCommerce = async () => {
    const r = await saveCommerceAction({ shippingFlatPence: toPence(ship) ?? 0, freeShippingPence: toPence(free), giftWrapPence: toPence(wrap) ?? 0, shippingCountries: countries.split(/[\s,]+/).filter(Boolean), supportEmail: support });
    setMsg(r.ok ? "Saved." : r.error); if (r.ok) router.refresh();
  };
  const saveSecrets = async (clear = false) => {
    const r = await saveSecretsAction({ stripeSecret: sk, stripeWebhookSecret: wh, resendKey: rk, emailFrom: from, clear });
    setPmsg(r.ok ? (clear ? "Removed." : "Saved.") : r.error);
    if (r.ok) { setSk(""); setWh(""); setRk(""); router.refresh(); }
  };
  return (
    <>
      <div className="adm-h"><div><h1>Shipping and payments</h1><p>The money rules and connected accounts for this store only. Other stores have their own.</p></div></div>
      <div className="adm-card" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <h2>Shipping and gifting</h2>
        <Field label="Flat shipping (£)"><input className="adm-in" inputMode="decimal" value={ship} onChange={(e) => setShip(e.target.value)} /></Field>
        <Field label="Free shipping from (£)" hint="Leave empty for no free-shipping offer."><input className="adm-in" inputMode="decimal" value={free} onChange={(e) => setFree(e.target.value)} /></Field>
        <Field label="Gift wrap price (£)"><input className="adm-in" inputMode="decimal" value={wrap} onChange={(e) => setWrap(e.target.value)} /></Field>
        <Field label="Ships to (country codes)" hint="For example GB, IE, US."><input className="adm-in" value={countries} onChange={(e) => setCountries(e.target.value)} /></Field>
        <Field label="Support email"><input className="adm-in" type="email" value={support} onChange={(e) => setSupport(e.target.value)} /></Field>
        <div><button type="button" className="adm-btn" onClick={saveCommerce}>Save</button> <span role="status">{msg}</span></div>
      </div>
      <div className="adm-card" style={{ display: "grid", gap: 12 }}>
        <h2>Payments and email</h2>
        <p style={{ margin: 0 }}>Each store uses its own Stripe account and its own sending address. Keys are write-only: once saved they are never shown again.</p>
        <p style={{ margin: 0 }}>Stripe: <b>{status.stripe ? "connected" : "not connected"}</b> · Webhook secret: <b>{status.webhook ? "set" : "not set"}</b> · Email: <b>{status.email ? "set" : "not set"}</b></p>
        <Field label="Stripe secret key" hint="sk_live_… or sk_test_…"><input className="adm-in" type="password" autoComplete="off" value={sk} onChange={(e) => setSk(e.target.value)} placeholder={status.stripe ? "•••••••• (leave blank to keep)" : ""} /></Field>
        <Field label="Stripe webhook signing secret" hint="Create a webhook in this store's Stripe account pointing at this store's own domain + /api/stripe/webhook."><input className="adm-in" type="password" autoComplete="off" value={wh} onChange={(e) => setWh(e.target.value)} placeholder={status.webhook ? "•••••••• (leave blank to keep)" : ""} /></Field>
        <Field label="Resend API key" hint="re_…"><input className="adm-in" type="password" autoComplete="off" value={rk} onChange={(e) => setRk(e.target.value)} placeholder={status.email ? "•••••••• (leave blank to keep)" : ""} /></Field>
        <Field label="Send emails from" hint="Shop Name <orders@yourdomain.com>, on a domain you have verified in Resend."><input className="adm-in" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="adm-btn" onClick={() => saveSecrets(false)}>Save</button>
          <button type="button" className="adm-btn" onClick={() => { if (confirm("Remove this store's Stripe and email credentials? Checkout and emails will stop until you add them again.")) saveSecrets(true); }}>Remove all</button>
          <span role="status">{pmsg}</span>
        </div>
      </div>
    </>
  );
}
