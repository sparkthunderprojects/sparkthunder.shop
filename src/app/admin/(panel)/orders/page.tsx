import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import type { OrderRow } from "@/lib/shop/fulfil";
import { filterOrders, needsShipping, orderValue, PAYMENT_FILTERS, PAYMENT_LABEL, SORT_LABEL, SORTS, STATUS_FILTERS, STATUS_LABEL, type OrderQuery } from "@/lib/orders-filter";
import { formatPrice } from "@/lib/site";
import { SelectAll } from "./SelectAll";

export const metadata = { title: "Orders" };
const PAGE = 50;
const BADGE = { paid: "adm-warn", shipped: "adm-ok", cancelled: "", attention: "adm-bad" } as const;
const LABEL = { paid: "To ship", shipped: "Shipped", cancelled: "Cancelled", attention: "Needs attention" } as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderQuery & { page?: string }> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin("orders");
  const { data } = await db.from("orders").select("*").order("created_at", { ascending: false });
  const orders = (data ?? []) as OrderRow[];
  const toShip = orders.filter(needsShipping).length;
  const attention = orders.filter((o) => o.status === "attention").length;
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total_pence - (o.refunded_card_pence ?? 0), 0);
  const list = filterOrders(orders, sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const shown = list.slice((page - 1) * PAGE, page * PAGE);
  const countries = [...new Set(orders.map((o) => o.shipping_address?.country).filter((c): c is string => Boolean(c)))].sort();
  const filtered = Boolean(sp.q || (sp.status && sp.status !== "all") || (sp.payment && sp.payment !== "any") || sp.from || sp.to || sp.discount || sp.country);
  const link = (over: Record<string, string>) => { const p = new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([k, v]) => v && typeof v === "string" && k !== "page" || (k === "page" && v && v !== "1")) as [string, string][]); return `/admin/orders?${p}` as never; };
  return (
    <>
      <div className="adm-h"><div><h1>Orders</h1><p>Paid orders from Stripe Checkout. Open an order to ship it or refund it. Tick orders to print invoices or packing slips together.</p></div><a className="adm-btn" href="/admin/export/orders" download>Download CSV</a></div>
      <div className="adm-grid adm-g3" style={{ marginBottom: 18 }}>
        {[[String(orders.length), "Orders"], [String(toShip), "Waiting to ship"], [String(attention), "Need attention"], [formatPrice(revenue), "Card revenue (after refunds, excl. gift cards)"]].map(([v, l]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>)}
      </div>
      <form method="get" className="adm-card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ flex: "1 1 240px" }}>Search<input className="adm-in" name="q" defaultValue={sp.q ?? ""} placeholder="Order number, name, email, phone, postcode, code, tracking or item" /></label>
        <label>Status<select className="adm-in" name="status" defaultValue={sp.status ?? "all"}>{STATUS_FILTERS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
        <label>Payment<select className="adm-in" name="payment" defaultValue={sp.payment ?? "any"}>{PAYMENT_FILTERS.map((s) => <option key={s} value={s}>{PAYMENT_LABEL[s]}</option>)}</select></label>
        <label>Country<select className="adm-in" name="country" defaultValue={sp.country ?? ""}><option value="">Any</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label>From<input className="adm-in" type="date" name="from" defaultValue={sp.from ?? ""} /></label>
        <label>To<input className="adm-in" type="date" name="to" defaultValue={sp.to ?? ""} /></label>
        <label>Sort<select className="adm-in" name="sort" defaultValue={sp.sort ?? "newest"}>{SORTS.map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}</select></label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" name="discount" value="1" defaultChecked={sp.discount === "1"} />Used a code</label>
        <button className="adm-btn adm-pri">Search</button>{filtered ? <Link className="adm-btn" href="/admin/orders">Clear</Link> : null}
      </form>
      <form action="/admin/print" method="get" target="_blank">
        <div style={{ display: "flex", gap: 10, margin: "0 0 10px", flexWrap: "wrap" }}>
          <button className="adm-btn" name="kind" value="packing">Print packing slips</button>
          <button className="adm-btn" name="kind" value="invoice">Print invoices</button>
          <span className="adm-hint" style={{ alignSelf: "center" }}>Up to 100 at once. Tick the orders first.</span>
        </div>
        <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="adm-table"><thead><tr><th style={{ width: 32 }}><SelectAll /></th><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
            {shown.map((o) => (
              <tr key={o.id}><td><input type="checkbox" name="id" value={o.id} aria-label={`Select ${o.number}`} /></td><td><Link href={`/admin/orders/${o.id}`}><b>{o.number}</b></Link></td><td>{new Date(o.created_at).toLocaleDateString("en-GB")}</td><td>{o.name || o.email}<div className="adm-hint">{o.email}</div></td>
                <td>{o.items.reduce((n, l) => n + l.qty, 0)}</td><td><b>{formatPrice(orderValue(o))}</b></td><td><span className={`adm-badge ${BADGE[o.status]}`}>{LABEL[o.status]}</span></td></tr>
            ))}
            {shown.length === 0 ? <tr><td colSpan={7} className="adm-hint" style={{ padding: 24 }}>{orders.length === 0 ? "No orders yet." : "No orders match those filters."}</td></tr> : null}
          </tbody></table>
        </div>
      </form>
      <p className="adm-hint" style={{ marginTop: 10 }}>{list.length} {list.length === 1 ? "order" : "orders"}{list.length > PAGE ? ` · page ${page} of ${Math.ceil(list.length / PAGE)}` : ""}
        {page > 1 ? <> · <Link href={link({ page: String(page - 1) })}>Previous</Link></> : null}{page * PAGE < list.length ? <> · <Link href={link({ page: String(page + 1) })}>Next</Link></> : null}</p>
    </>
  );
}
