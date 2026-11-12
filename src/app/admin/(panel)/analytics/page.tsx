import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { buildAnalytics, type Slice } from "@/lib/analytics";
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
  const a = buildAnalytics((o ?? []) as OrderRow[], { since: r === "all" ? 0 : now - Number(r) * 86400000, franchiseOf, nowMs: now });
  const nvTotal = a.newVsReturning.new.value + a.newVsReturning.returning.value;
  const weekdays = [...a.byWeekday.slice(1), a.byWeekday[0]];

  return (
    <>
      <div className="adm-h"><div><h1>Analytics</h1><p>Deeper views of your sales. Cancelled orders are left out; times are UTC.</p></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{RANGES.map(([k, l]) => <Link key={k} className={`adm-btn ${k === r ? "adm-pri" : ""}`} href={`/admin/analytics?range=${k}`}>{l}</Link>)}</div></div>
      <div className="adm-grid adm-g4" style={{ marginBottom: 6 }}>
        {[[formatPrice(a.value), "Sales value"], [String(a.orders), "Orders"], [formatPrice(a.aov), "Average order"], [nvTotal ? `${Math.round((a.newVsReturning.returning.value / nvTotal) * 100)}%` : "-", "Sales from returning customers"]].map(([v, l]) => (
          <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>
        ))}
      </div>
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
