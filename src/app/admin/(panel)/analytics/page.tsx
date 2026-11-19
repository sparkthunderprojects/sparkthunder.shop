import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { buildAnalytics, buildOverview, type Slice } from "@/lib/analytics";
import { SalesChart, StatCard, Delta, Heatmap } from "./Charts";
import { currentStoreId, listStores } from "@/lib/db/stores";
import { buildHeatmap } from "@/lib/analytics";
import { countryName } from "@/lib/regions";
import type { OrderRow } from "@/lib/shop/fulfil";
import { formatPrice } from "@/lib/site";
import { nowMs } from "@/lib/time";

export const metadata = { title: "Analytics" };
const RANGES = [["30", "30 days"], ["90", "90 days"], ["365", "12 months"], ["all", "All time"]] as const;
const PAY_LABEL = { card: "Card only", gift: "Gift card only", mixed: "Card and gift card", free: "Nothing to pay" } as const;

function Bars({ rows, label }: { rows: Slice[]; label: (s: Slice) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.orders === 0)) return <p className="adm-hint">No sales in this period yet.</p>;
  return (
    <table className="adm-table"><thead><tr><th>&nbsp;</th><th>Orders</th><th>Sales</th><th style={{ width: "35%" }}>&nbsp;</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.label}><td>{label(r)}</td><td>{r.orders}</td><td><b>{formatPrice(r.value)}</b></td>
        <td><div aria-hidden style={{ background: "#6b5cff", height: 8, borderRadius: 4, width: `${Math.round((r.value / max) * 100)}%`, minWidth: r.value ? 2 : 0 }} /></td></tr>)}
    </tbody></table>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const { db } = await requireAdmin("reports");
  const sp = await searchParams;
  const r = typeof sp.range === "string" && RANGES.some(([k]) => k === sp.range) ? sp.range : "90";
  const [{ data: o }, { data: p }, { data: f }] = await Promise.all([db.from("orders").select("*"), db.from("products").select("slug, franchise_slug"), db.from("franchises").select("slug, name")]);
  const names = new Map(((f ?? []) as { slug: string; name: string }[]).map((x) => [x.slug, x.name]));
  const franchiseOf = new Map(((p ?? []) as { slug: string; franchise_slug: string }[]).map((x) => [x.slug, names.get(x.franchise_slug) ?? x.franchise_slug]));
  const now = nowMs();
  const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null);
  const from = day(sp.from), to = day(sp.to);
  const custom = from !== null && to !== null && to >= from;
  const orders = (o ?? []) as OrderRow[];
  const earliest = Math.min(now, ...orders.map((x) => Date.parse(x.created_at)).filter(Number.isFinite));
  const since = custom ? from : r === "all" ? Math.max(earliest, now - 365 * 86400000) : now - Number(r) * 86400000;
  const until = custom ? to + 86400000 : now + 1;
  const a = buildAnalytics(orders, { since: custom ? from : r === "all" ? 0 : since, until, franchiseOf, nowMs: now });
  const compare = custom || r !== "all";
  const ov = buildOverview(orders, { since, until, compare });
  const grid = buildHeatmap(orders, since, until);
  const sid = await currentStoreId(), storeName = (await listStores()).find((x) => x.id === sid)?.name ?? sid;
  const weekdays = [...a.byWeekday.slice(1), a.byWeekday[0]];

  return (
    <>
      <div className="adm-h"><div><h1>Analytics: {storeName}</h1><p>Sales for this store only. Switch store in the sidebar to see another. Cancelled orders are left out; times are UTC.</p></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{RANGES.map(([k, l]) => <Link key={k} className={`adm-btn ${!custom && k === r ? "adm-pri" : ""}`} style={!custom && k === r ? { color: "#fff" } : undefined} href={`/admin/analytics?range=${k}`}>{l}</Link>)}</div></div>
      <form method="get" action="/admin/analytics" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ fontSize: 12 }}>From<br /><input type="date" name="from" defaultValue={custom ? sp.from as string : ""} required /></label>
        <label style={{ fontSize: 12 }}>To<br /><input type="date" name="to" defaultValue={custom ? sp.to as string : ""} required /></label>
        <button className="adm-btn" type="submit">Compare with the period before</button>
        <a className="adm-btn" href={`/admin/export/analytics?since=${new Date(since).toISOString().slice(0, 10)}&until=${new Date(until - 1).toISOString().slice(0, 10)}`}>Download daily CSV</a>
      </form>
      <div className="adm-grid adm-g4" style={{ marginBottom: 12 }}>
        <StatCard label="Sales value" value={formatPrice(ov.now.value)} now={ov.now.value} before={ov.before?.value} />
        <StatCard label="Orders" value={String(ov.now.orders)} now={ov.now.orders} before={ov.before?.orders} />
        <StatCard label="Average order" value={formatPrice(ov.now.aov)} now={ov.now.aov} before={ov.before?.aov} />
        <StatCard label="Items sold" value={String(ov.now.units)} now={ov.now.units} before={ov.before?.units} />
        <StatCard label="Customers" value={String(ov.now.customers)} now={ov.now.customers} before={ov.before?.customers} />
        <StatCard label="New customers" value={String(ov.now.newCustomers)} now={ov.now.newCustomers} before={ov.before?.newCustomers} />
        <StatCard label="Discounts given" value={formatPrice(ov.now.discountPence)} now={ov.now.discountPence} before={ov.before?.discountPence} invert />
        <StatCard label="Repeat customers" value={ov.now.customers ? `${Math.round(((ov.now.customers - ov.now.newCustomers) / ov.now.customers) * 100)}%` : "-"} now={ov.now.customers ? (ov.now.customers - ov.now.newCustomers) / ov.now.customers : 0} before={ov.before ? (ov.before.customers ? (ov.before.customers - ov.before.newCustomers) / ov.before.customers : 0) : null} />
        <StatCard label="Shipping collected" value={formatPrice(ov.now.shippingPence)} now={ov.now.shippingPence} before={ov.before?.shippingPence} />
        <StatCard label="Refund rate" value={ov.now.value + ov.now.refundedPence ? `${((ov.now.refundedPence / (ov.now.value + ov.now.refundedPence)) * 100).toFixed(1)}%` : "-"} now={ov.now.refundedPence} before={ov.before?.refundedPence} invert />
        <StatCard label="Refunded" value={formatPrice(ov.now.refundedPence)} now={ov.now.refundedPence} before={ov.before?.refundedPence} invert />
      </div>
      <section className="adm-card"><h2>Sales and orders over time</h2>
        <p className="adm-hint">Line is sales value, bars are orders per day. Hover a point for the day.</p>
        <SalesChart days={ov.days} ariaLabel="Sales and orders per day" /></section>
      <section className="adm-card"><h2>When customers buy</h2><Heatmap grid={grid} /></section>
      <section className="adm-card"><h2>Top products</h2>
        {ov.products.length === 0 ? <p className="adm-hint">No sales in this period yet.</p> : <table className="adm-table"><thead><tr><th>Product</th><th>Units</th><th>Sales</th>{compare ? <th>Change</th> : null}</tr></thead><tbody>
          {ov.products.map((p) => <tr key={p.slug}><td>{p.name}</td><td>{p.units}</td><td><b>{formatPrice(p.value)}</b></td>{compare ? <td><Delta now={p.value} before={p.beforeValue} /></td> : null}</tr>)}</tbody></table>}</section>
      <p className="adm-hint" style={{ margin: "0 0 14px" }}>Sales value counts card and gift card payments after refunds, so it can be higher than the revenue on the Sales page, which counts card money only.</p>
      <div className="adm-grid adm-g2">
        <section className="adm-card"><h2>Sales by country</h2><Bars rows={a.byCountry} label={(s) => (s.label === "Unknown" ? "Unknown" : countryName(s.label) || s.label)} /></section>
        <section className="adm-card"><h2>Sales by franchise</h2><Bars rows={a.byFranchise} label={(s) => s.label} /></section>
        <section className="adm-card"><h2>New and returning customers</h2><Bars rows={[a.newVsReturning.new, a.newVsReturning.returning]} label={(s) => s.label} /></section>
        <section className="adm-card"><h2>How customers paid</h2>
          <table className="adm-table"><tbody>{a.payment.map((x) => <tr key={x.kind}><td>{PAY_LABEL[x.kind]}</td><td><b>{x.orders}</b></td></tr>)}</tbody></table></section>
        <section className="adm-card"><h2>Sales by day of the week</h2><Bars rows={weekdays} label={(s) => s.label} /></section>
        <section className="adm-card"><h2>Discount codes</h2>
          {a.codes.length === 0 ? <p className="adm-hint">No codes used in this period.</p> : <table className="adm-table"><thead><tr><th>Code</th><th>Orders</th><th>Discount given</th><th>Sales</th></tr></thead><tbody>
            {a.codes.map((c) => <tr key={c.code}><td><b>{c.code}</b></td><td>{c.orders}</td><td>{formatPrice(c.discountPence)}</td><td>{formatPrice(c.value)}</td></tr>)}</tbody></table>}</section>
      </div>
      <section className="adm-card"><h2>Top customers</h2>
        {a.topCustomers.length === 0 ? <p className="adm-hint">No sales in this period yet.</p> : <table className="adm-table"><thead><tr><th>Customer</th><th>Orders</th><th>Spent</th></tr></thead><tbody>
          {a.topCustomers.map((c) => <tr key={c.email}><td>{c.name || "-"}<div className="adm-hint">{c.email}</div></td><td>{c.orders}</td><td><b>{formatPrice(c.value)}</b></td></tr>)}</tbody></table>}</section>
      <section className="adm-card"><h2>Do customers come back?</h2>
        <p className="adm-hint">Customers grouped by the month of their first order, and how many ordered in each month after. Month 0 is their first month. All time, not affected by the range above.</p>
        {a.cohorts.length === 0 ? <p className="adm-hint">No orders yet.</p> : <table className="adm-table"><thead><tr><th>First order</th><th>Customers</th>{[0, 1, 2, 3, 4, 5].map((i) => <th key={i}>Month {i}</th>)}</tr></thead><tbody>
          {a.cohorts.map((c) => <tr key={c.month}><td>{c.month}</td><td><b>{c.size}</b></td>{[0, 1, 2, 3, 4, 5].map((i) => <td key={i}>{c.active[i] === undefined ? "" : `${c.active[i]} (${Math.round((c.active[i] / c.size) * 100)}%)`}</td>)}</tr>)}</tbody></table>}</section>
      <section className="adm-card"><h2>Busiest hours</h2><Bars rows={a.byHour.filter((h) => h.orders > 0)} label={(s) => s.label} /></section>
    </>
  );
}
