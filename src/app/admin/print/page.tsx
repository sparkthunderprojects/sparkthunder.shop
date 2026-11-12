import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getCommerce } from "@/lib/commerce";
import type { OrderRow } from "@/lib/shop/fulfil";
import { buildInvoice, addressLines } from "@/lib/invoice";
import { normaliseStore, type StoreSettings } from "@/lib/store-config";
import { formatPrice } from "@/lib/site";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Print" };
const MAX = 100;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const CSS = `
.doc{font:14px/1.5 system-ui,sans-serif;color:#111;background:#fff;max-width:800px;margin:0 auto;padding:32px}
.doc h1{font-size:26px;margin:0 0 4px}.doc h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#555;margin:0 0 6px}
.doc table{width:100%;border-collapse:collapse;margin:18px 0}.doc th{text-align:left;font-size:12px;text-transform:uppercase;color:#555;border-bottom:2px solid #111;padding:6px 8px}
.doc td{padding:8px;border-bottom:1px solid #ddd;vertical-align:top}.doc .r{text-align:right}.doc .cols{display:flex;gap:40px;justify-content:space-between;flex-wrap:wrap}
.doc .totals{margin-left:auto;width:320px}.doc .totals div{display:flex;justify-content:space-between;padding:3px 0}.doc .totals .big{font-weight:700;font-size:16px;border-top:2px solid #111;margin-top:4px;padding-top:6px}
.doc .box{width:16px;height:16px;border:2px solid #111;display:inline-block}.doc .note{border:2px solid #111;padding:10px 12px;margin:14px 0}
.doc .page{page-break-after:always}.doc .page:last-child{page-break-after:auto}.doc .bar{margin-bottom:20px;display:flex;gap:12px;align-items:center}
@media print{.no-print{display:none!important}.doc{padding:0;max-width:none}}`;

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ kind?: string; id?: string | string[] }> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin("orders");
  const kind = sp.kind === "packing" ? "packing" : "invoice";
  const ids = [...new Set((Array.isArray(sp.id) ? sp.id : sp.id ? [sp.id] : []))].slice(0, MAX);
  const [{ data }, commerce, { data: st }] = await Promise.all([
    ids.length ? db.from("orders").select("*").in("id", ids) : Promise.resolve({ data: [] }),
    getCommerce(), db.from("settings").select("value").eq("key", "store").maybeSingle(),
  ]);
  const store = normaliseStore((st as { value?: Partial<StoreSettings> } | null)?.value);
  const byId = new Map(((data ?? []) as OrderRow[]).map((o) => [o.id, o]));
  const orders = ids.map((i) => byId.get(i)).filter((o): o is OrderRow => Boolean(o));
  return (
    <div className="doc">
      <style>{CSS}</style>
      <div className="bar no-print"><PrintButton /><span>{orders.length} {kind === "packing" ? "packing slip" : "invoice"}{orders.length === 1 ? "" : "s"}</span><Link href="/admin/orders">Back to orders</Link></div>
      {orders.length === 0 ? <p>No orders to print. Select orders in the list and try again.</p> : null}
      {orders.map((o) => {
        if (kind === "packing") {
          const items = o.items.filter((l) => l.type === "product");
          return (
            <section className="page" key={o.id}>
              <div className="cols"><div><h1>Packing slip</h1><div>Order <b>{o.number}</b> · {day(o.created_at)}</div></div><div style={{ textAlign: "right" }}><b>{store.legalName || store.name}</b></div></div>
              <div className="cols" style={{ marginTop: 18 }}>
                <div><h2>Deliver to</h2>{addressLines(o.shipping_address).map((l, i) => <div key={i}>{l}</div>)}{o.phone ? <div>Tel: {o.phone}</div> : null}</div>
                {o.tracking_number ? <div><h2>Tracking</h2><div>{o.tracking_carrier} {o.tracking_number}</div></div> : null}
              </div>
              {o.gift_message || o.gift_wrap ? <div className="note"><b>This is a gift. Do not include prices.</b>{o.gift_wrap ? <div>Gift wrap requested.</div> : null}{o.gift_message ? <div>Message: {o.gift_message}</div> : null}</div> : null}
              <table><thead><tr><th style={{ width: 30 }} /><th>Item</th><th>SKU</th><th className="r">Qty</th></tr></thead><tbody>
                {items.map((l, i) => <tr key={i}><td><span className="box" /></td><td>{l.type === "product" && l.variant && !l.name.includes(`(${l.variant})`) ? `${l.name} (${l.variant})` : l.name}</td><td>{l.type === "product" ? l.sku : ""}</td><td className="r"><b>{l.qty}</b></td></tr>)}
                {items.length === 0 ? <tr><td colSpan={4}>Nothing to post (digital or gift card order).</td></tr> : null}
              </tbody></table>
              {o.notes ? <div className="note"><b>Notes:</b> {o.notes}</div> : null}
              <p style={{ color: "#555" }}>Questions? {commerce.supportEmail || "Contact us through the shop"}.</p>
            </section>
          );
        }
        const inv = buildInvoice(o);
        return (
          <section className="page" key={o.id}>
            <div className="cols">
              <div><h1>{inv.vat ? "VAT invoice" : "Invoice"}</h1><div>Invoice no. <b>{inv.number}</b></div><div>Date: {day(inv.date)}</div></div>
              <div style={{ textAlign: "right" }}><b>{store.legalName || store.name}</b>{commerce.businessAddress ? <div style={{ whiteSpace: "pre-line" }}>{commerce.businessAddress}</div> : null}{inv.vat?.number ? <div>VAT no. {inv.vat.number}</div> : null}{commerce.supportEmail ? <div>{commerce.supportEmail}</div> : null}</div>
            </div>
            <div style={{ marginTop: 18 }}><h2>Bill to</h2>{inv.billTo.address.length ? inv.billTo.address.map((l, i) => <div key={i}>{l}</div>) : <div>{inv.billTo.name}</div>}<div>{inv.billTo.email}</div></div>
            <table><thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Total</th></tr></thead><tbody>
              {inv.lines.map((l, i) => <tr key={i}><td>{l.name}<div style={{ color: "#666", fontSize: 12 }}>{l.sku}</div></td><td className="r">{l.qty}</td><td className="r">{formatPrice(l.unitPence)}</td><td className="r">{formatPrice(l.totalPence)}</td></tr>)}
            </tbody></table>
            <div className="totals">
              <div><span>Items</span><span>{formatPrice(inv.subtotalPence)}</span></div>
              {inv.discountPence > 0 ? <div><span>Discount{inv.discountCode ? ` (${inv.discountCode})` : ""}</span><span>-{formatPrice(inv.discountPence)}</span></div> : null}
              <div><span>Delivery</span><span>{inv.shippingPence ? formatPrice(inv.shippingPence) : "Free"}</span></div>
              {inv.giftWrapPence > 0 ? <div><span>Gift wrap</span><span>{formatPrice(inv.giftWrapPence)}</span></div> : null}
              <div className="big"><span>Total</span><span>{formatPrice(inv.totalPence)}</span></div>
              {inv.vat ? <><div><span>Total excluding VAT</span><span>{formatPrice(inv.vat.netPence)}</span></div><div><span>VAT at {inv.vat.ratePercent}% (included)</span><span>{formatPrice(inv.vat.pence)}</span></div></> : null}
              {inv.paidByGiftCardPence > 0 ? <div><span>Paid by gift card</span><span>{formatPrice(inv.paidByGiftCardPence)}</span></div> : null}
              {inv.paidByCardPence > 0 ? <div><span>Paid by card</span><span>{formatPrice(inv.paidByCardPence)}</span></div> : null}
              {inv.refundedPence > 0 ? <div><span>Refunded</span><span>-{formatPrice(inv.refundedPence)}</span></div> : null}
            </div>
            <p style={{ color: "#555", marginTop: 28 }}>Prices include VAT where it applies. Thank you for your order.</p>
          </section>
        );
      })}
    </div>
  );
}
