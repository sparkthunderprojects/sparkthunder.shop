"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchRatesAction, saveCommerceAction, saveSecretsAction } from "../../commerce-actions";
import type { CommerceSettings } from "@/lib/commerce-config";
import { Toggle } from "../../ui";
import { SITE } from "@/lib/site";

/** "500=3.50, 1000=4.50" (grams = pounds) to bands, and back. */
const bandsToText = (b?: { upToGrams: number; pence: number }[]) => (b ?? []).map((x) => `${x.upToGrams}=${(x.pence / 100).toFixed(2)}`).join(", ");
const textToBands = (t: string) => t.split(/[,\n]+/).map((x) => x.split("=")).filter((p) => p.length === 2).map(([g, p]) => ({ upToGrams: Math.round(Number(g.replace(/[^0-9.]/g, ""))), pence: Math.round(Number(p.replace(/[^0-9.]/g, "")) * 100) })).filter((b) => b.upToGrams > 0 && Number.isFinite(b.pence));
const mapToText = (m: Record<string, number>) => Object.entries(m).map(([k, v]) => `${k}=${v}`).join("\n");
const textToMap = (t: string) => Object.fromEntries(t.split(/\n+/).map((l) => l.split("=")).filter((p) => p.length === 2 && p[0].trim()).map(([k, v]) => [k.trim(), Math.round(Number(v))]).filter(([, v]) => Number.isFinite(v) && (v as number) >= 0));

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label style={{ display: "grid", gap: 4 }}><span>{label}</span>{children}{hint ? <small style={{ opacity: 0.7 }}>{hint}</small> : null}</label>
);
const pounds = (p: number | null) => (p == null ? "" : (p / 100).toFixed(2));
const toPence = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));

export function CommerceForm({ commerce, categories, status }: { commerce: CommerceSettings; categories: { slug: string; name: string }[]; status: { stripe: boolean; webhook: boolean; email: boolean; emailFrom: string } }) {
  const router = useRouter();
  const [ship, setShip] = useState(pounds(commerce.shippingFlatPence));
  const [free, setFree] = useState(pounds(commerce.freeShippingPence));
  const [wrap, setWrap] = useState(pounds(commerce.giftWrapPence));
  const [countries, setCountries] = useState(commerce.shippingCountries.join(", "));
  const [support, setSupport] = useState(commerce.supportEmail);
  const [prefix, setPrefix] = useState(commerce.codePrefix);
  const [vatOn, setVatOn] = useState(commerce.vatEnabled), [vatRate, setVatRate] = useState(String(commerce.vatRatePercent)), [vatNo, setVatNo] = useState(commerce.vatNumber);
  type ZoneForm = { name: string; countries: string; first: string; extra: string; free: string; byWeight: boolean; bands: string; perKg: string };
  const [zones, setZones] = useState<ZoneForm[]>(commerce.shippingZones.map((z) => ({ name: z.name, countries: z.countries.join(", "), first: pounds(z.firstItemPence), extra: pounds(z.extraItemPence), free: pounds(z.freeOverPence), byWeight: Boolean(z.bands?.length), bands: bandsToText(z.bands), perKg: pounds(z.extraPerKgPence ?? 0) })));
  const setZone = (i: number, patch: Partial<ZoneForm>) => setZones((zs) => zs.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const [currencies, setCurrencies] = useState(commerce.currencies.map((c) => ({ code: c.code, rate: String(c.rate) })));
  const setCur = (i: number, patch: Partial<{ code: string; rate: string }>) => setCurrencies((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const getRates = async () => {
    const r = await fetchRatesAction(currencies.map((c) => c.code));
    if (!r.ok) { setMsg(r.error); return; }
    setCurrencies((cs) => cs.map((c) => (r.rates[c.code.toUpperCase()] ? { ...c, rate: String(r.rates[c.code.toUpperCase()]) } : c)));
    setMsg("Today's rates filled in. Press Save to keep them.");
  };
  const [defGrams, setDefGrams] = useState(String(commerce.weights.defaultGrams));
  const [catGrams, setCatGrams] = useState<Record<string, string>>(Object.fromEntries(Object.entries(commerce.weights.byCategory).map(([k, v]) => [k, String(v)])));
  const [prodGrams, setProdGrams] = useState(mapToText(commerce.weights.byProduct));
  const [msg, setMsg] = useState("");
  const [sk, setSk] = useState(""), [wh, setWh] = useState(""), [rk, setRk] = useState(""), [from, setFrom] = useState(status.emailFrom);
  const [pmsg, setPmsg] = useState("");

  const saveCommerce = async () => {
    const r = await saveCommerceAction({ shippingZones: zones.map((z) => ({ name: z.name, countries: z.countries.split(/[\s,]+/).filter(Boolean), firstItemPence: toPence(z.first) ?? 0, extraItemPence: toPence(z.extra) ?? 0, freeOverPence: toPence(z.free), ...(z.byWeight ? { bands: textToBands(z.bands), extraPerKgPence: toPence(z.perKg) ?? 0 } : {}) })), shippingFlatPence: toPence(ship) ?? 0, freeShippingPence: toPence(free), giftWrapPence: toPence(wrap) ?? 0, shippingCountries: countries.split(/[\s,]+/).filter(Boolean), supportEmail: support, codePrefix: prefix, vatEnabled: vatOn, vatRatePercent: Number(vatRate) || 0, vatNumber: vatNo, weights: { defaultGrams: Math.round(Number(defGrams)) || 0, byCategory: Object.fromEntries(Object.entries(catGrams).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, Math.round(Number(v))])), byProduct: textToMap(prodGrams) }, currencies: currencies.map((c) => ({ code: c.code.trim().toUpperCase(), rate: Number(c.rate) })).filter((c) => c.code && Number.isFinite(c.rate)) });
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
        {zones.length === 0 ? (
          <>
            <Field label="Flat shipping (£)"><input className="adm-in" inputMode="decimal" value={ship} onChange={(e) => setShip(e.target.value)} /></Field>
            <Field label="Free shipping from (£)" hint="Leave empty for no free-shipping offer."><input className="adm-in" inputMode="decimal" value={free} onChange={(e) => setFree(e.target.value)} /></Field>
          </>
        ) : null}
        <div style={{ display: "grid", gap: 10 }}>
          <b>Delivery zones</b>
          <small style={{ opacity: 0.7 }}>{zones.length ? "Each country belongs to one zone. Delivery costs the first-item price, plus the extra-item price for each further item (print-on-demand items post separately, so this follows Printify's own pricing). Customers can only choose countries listed here." : "Optional. Without zones, every country in the list below pays the flat rate above. Add zones to charge different amounts for the UK, Europe, the rest of the world, and so on."}</small>
          {zones.map((z, i) => (
            <div key={i} className="adm-card" style={{ display: "grid", gap: 8 }}>
              <div className="adm-grid adm-g2">
                <Field label="Zone name"><input className="adm-in" value={z.name} onChange={(e) => setZone(i, { name: e.target.value })} placeholder="United Kingdom" /></Field>
                <Field label="Country codes" hint="For example GB, IE, FR, DE."><input className="adm-in" value={z.countries} onChange={(e) => setZone(i, { countries: e.target.value })} /></Field>
              </div>
              <Field label="Charge by"><select className="adm-sel" value={z.byWeight ? "weight" : "items"} onChange={(e) => setZone(i, { byWeight: e.target.value === "weight" })}><option value="items">Number of items</option><option value="weight">Weight of the basket</option></select></Field>
              {z.byWeight ? (
                <div className="adm-grid adm-g2">
                  <Field label="Weight bands" hint="Up to this many grams = this price (£). For example 500=3.50, 1000=4.50, 2000=6.00."><input className="adm-in" value={z.bands} onChange={(e) => setZone(i, { bands: e.target.value })} placeholder="500=3.50, 1000=4.50, 2000=6.00" /></Field>
                  <Field label="Over the heaviest band: each extra kg (£)" hint="Leave 0 to charge the heaviest band's price."><input className="adm-in" inputMode="decimal" value={z.perKg} onChange={(e) => setZone(i, { perKg: e.target.value })} /></Field>
                </div>
              ) : (
                <div className="adm-grid adm-g2">
                  <Field label="First item (£)"><input className="adm-in" inputMode="decimal" value={z.first} onChange={(e) => setZone(i, { first: e.target.value })} /></Field>
                  <Field label="Each extra item (£)"><input className="adm-in" inputMode="decimal" value={z.extra} onChange={(e) => setZone(i, { extra: e.target.value })} /></Field>
                </div>
              )}
              <Field label="Free delivery over (£)" hint="Leave empty for none."><input className="adm-in" inputMode="decimal" value={z.free} onChange={(e) => setZone(i, { free: e.target.value })} /></Field>
              <div><button type="button" className="adm-btn" onClick={() => setZones((zs) => zs.filter((_, j) => j !== i))}>Remove zone</button></div>
            </div>
          ))}
          <div><button type="button" className="adm-btn" onClick={() => setZones((zs) => [...zs, { name: "", countries: "", first: "", extra: "", free: "", byWeight: false, bands: "", perKg: "" }])}>Add a delivery zone</button></div>
        </div>
        <Field label="Gift wrap price (£)"><input className="adm-in" inputMode="decimal" value={wrap} onChange={(e) => setWrap(e.target.value)} /></Field>
        {zones.length === 0 ? <Field label="Ships to (country codes)" hint="For example GB, IE, US."><input className="adm-in" value={countries} onChange={(e) => setCountries(e.target.value)} /></Field> : null}
        <Toggle label="This store is VAT registered" checked={vatOn} onChange={setVatOn} hint="Your prices already include VAT. This works out the VAT part and shows it on order emails and in the admin. Leave off until you are registered." />
        {vatOn ? <div className="adm-grid adm-g2"><Field label="VAT rate (%)" hint="20 is the UK standard rate."><input className="adm-in" inputMode="decimal" value={vatRate} onChange={(e) => setVatRate(e.target.value)} /></Field><Field label="VAT number" hint="Shown on order emails, e.g. GB123456789."><input className="adm-in" value={vatNo} onChange={(e) => setVatNo(e.target.value)} /></Field></div> : null}
        {zones.some((z) => z.byWeight) ? (
          <div style={{ display: "grid", gap: 10 }}>
            <b>What things weigh</b>
            <small style={{ opacity: 0.7 }}>Used by zones that charge by weight. A product&rsquo;s own weight wins, then its category&rsquo;s, then the default. Include packaging.</small>
            <Field label="Default weight of one item (grams)"><input className="adm-in" inputMode="numeric" value={defGrams} onChange={(e) => setDefGrams(e.target.value)} /></Field>
            <div className="adm-grid adm-g3">
              {categories.map((c) => <Field key={c.slug} label={`${c.name} (grams)`}><input className="adm-in" inputMode="numeric" value={catGrams[c.slug] ?? ""} onChange={(e) => setCatGrams((m) => ({ ...m, [c.slug]: e.target.value }))} placeholder="default" /></Field>)}
            </div>
            <Field label="Individual products (one per line: product-slug=grams)" hint="Only for products that differ from their category."><textarea className="adm-in" rows={4} value={prodGrams} onChange={(e) => setProdGrams(e.target.value)} placeholder="knightverge-crest-tee=220" /></Field>
          </div>
        ) : null}
        <div style={{ display: "grid", gap: 10 }}>
          <b>Display currencies</b>
          <small style={{ opacity: 0.7 }}>Optional. Shoppers can choose to view prices in these currencies. It is display only: orders are always charged in {SITE.currency}, and converted amounts are shown as approximate. Rate = how many of that currency equal 1 {SITE.currency}.</small>
          {currencies.map((c, i) => (
            <div key={i} className="adm-grid adm-g3" style={{ alignItems: "end" }}>
              <Field label="Currency code"><input className="adm-in" maxLength={3} value={c.code} onChange={(e) => setCur(i, { code: e.target.value.toUpperCase() })} placeholder="USD" /></Field>
              <Field label={`Rate (per 1 ${SITE.currency})`}><input className="adm-in" inputMode="decimal" value={c.rate} onChange={(e) => setCur(i, { rate: e.target.value })} placeholder="1.27" /></Field>
              <div><button type="button" className="adm-btn" onClick={() => setCurrencies((cs) => cs.filter((_, j) => j !== i))}>Remove</button></div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="adm-btn" onClick={() => setCurrencies((cs) => [...cs, { code: "", rate: "" }])}>Add a currency</button>
            {currencies.length ? <button type="button" className="adm-btn" onClick={getRates}>Fill in today&rsquo;s rates</button> : null}
          </div>
        </div>
        <Field label="Support email"><input className="adm-in" type="email" value={support} onChange={(e) => setSupport(e.target.value)} /></Field>
        <Field label="Order and gift card prefix" hint={`Letters at the start of order numbers and gift card codes, e.g. ${prefix || "SPK"}-1001. 2 to 5 letters or numbers.`}><input className="adm-in" maxLength={5} value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></Field>
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
