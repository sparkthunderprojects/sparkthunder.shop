import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { withBundleStock } from "@/lib/catalog";
import { productFromRow, type ProductRow } from "@/lib/db/mappers";
import type { OrderRow } from "@/lib/shop/fulfil";
import { formatPrice } from "@/lib/site";
import { summariseSales, type SnapshotLite } from "@/lib/admin/reporting";
import { nowMs } from "@/lib/time";

export const metadata = { title: "Sales" };
const RANGES = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All time"]] as const;

export default async function SalesPage({ searchParams }: PageProps<"/admin/sales">) {
  const { db } = await requireAdmin("reports");
  const sp = await searchParams;
  const r = typeof sp.range === "string" && RANGES.some(([k]) => k === sp.range) ? sp.range : "30";
  const [{ data: o }, { data: p }, { data: sn }] = await Promise.all([db.from("orders").select("*").order("created_at", { ascending: false }), db.from("products").select("*"), db.from("checkout_snapshots").select("created_at, fulfilled_at")]);
  const everyOrder = (o ?? []) as OrderRow[];
  const all = everyOrder.filter((x) => x.status !== "cancelled");
  const since = r === "all" ? 0 : nowMs() - Number(r) * 86400000;
  const orders = all.filter((x) => new Date(x.created_at).getTime() >= since);

  const sum = summariseSales(everyOrder, (sn ?? []) as SnapshotLite[], since);

  // daily series
  const days = r === "all" ? Math.min(90, Math.max(7, Math.ceil((nowMs() - Math.min(nowMs(), ...orders.map((x) => new Date(x.created_at).getTime()))) / 86400000) + 1)) : Number(r);
  const series: { d: string; v: number }[] = [];
  for (let i = days - 1; i >= 0; i--) { const dt = new Date(nowMs() - i * 86400000); series.push({ d: dt.toISOString().slice(0, 10), v: 0 }); }
  for (const x of orders) { const k = x.created_at.slice(0, 10); const s = series.find((y) => y.d === k); if (s) s.v += x.total_pence - (x.refunded_card_pence ?? 0); }
  const max = Math.max(1, ...series.map((s) => s.v));

  // top products
  const top = new Map<string, { name: string; slug: string; units: number; pence: number }>();
  for (const x of orders) for (const l of x.items) {
    if (l.type !== "product") continue;
    const t = top.get(l.slug) ?? { name: l.name, slug: l.slug, units: 0, pence: 0 };
    t.units += l.qty; t.pence += l.qty * l.unitPence; top.set(l.slug, t);
  }
  const best = [...top.values()].sort((a, b) => b.pence - a.pence).slice(0, 8);

  // stock report
  const products = withBundleStock(((p ?? []) as ProductRow[]).map(productFromRow));
  const rows: { slug: string; name: string; option: string; qty: number; thr: number }[] = [];
  for (const pr of products) {
    if (pr.published === false || pr.bundleItems?.length) continue;
    const thr = pr.lowStockThreshold ?? 3;
    if (pr.variants?.length) { for (const v of pr.variants) if (pr.trackStock !== false && v.stockQty <= thr) rows.push({ slug: pr.slug, name: pr.name, option: v.name, qty: v.stockQty, thr }); }
    else if (pr.trackStock && (pr.stockQty ?? 0) <= thr) rows.push({ slug: pr.slug, name: pr.name, option: "", qty: pr.stockQty ?? 0, thr });
    else if (!pr.inStock) rows.push({ slug: pr.slug, name: pr.name, option: "", qty: 0, thr });
  }
  rows.sort((a, b) => a.qty - b.qty);

  return (
    <>
      <div className="adm-h"><div><h1>Sales</h1><p>Paid orders only, cancelled orders are left out.</p></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{RANGES.map(([k, l]) => <Link key={k} className={`adm-btn ${k === r ? "adm-pri" : ""}`} href={`/admin/sales?range=${k}`}>{l}</Link>)}</div></div>
      <div className="adm-grid adm-g4" style={{ marginBottom: 18 }}>
        {[[formatPrice(sum.revenue), "Revenue (after refunds)"], [String(sum.orders), "Orders"], [formatPrice(sum.aov), "Average order"], [String(sum.units), "Items sold"], [formatPrice(sum.refunded), "Refunded"], [formatPrice(sum.discounts), "Given in discounts"], [`${sum.repeatPct}%`, "Repeat customers"], [sum.completionPct === null ? "-" : `${sum.completionPct}%`, "Checkouts completed"]].map(([v, l]) => (
          <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>
        ))}
      </div>
      <p className="adm-hint" style={{ margin: "-6px 0 14px" }}>Revenue is card payments kept after refunds (gift card money is not counted). Checkouts completed = paid checkouts as a share of checkouts started in this period; ones still open (under 40 minutes) are not counted.</p>
      <section className="adm-card">
        <h2>Revenue per day</h2>
        <svg viewBox={`0 0 ${series.length * 10} 100`} preserveAspectRatio="none" role="img" aria-label="Revenue per day" style={{ width: "100%", height: 140, display: "block" }}>
          {series.map((s, i) => <rect key={s.d} x={i * 10 + 1} width={8} y={100 - (s.v / max) * 98} height={Math.max(s.v ? 1 : 0, (s.v / max) * 98)} rx={1} fill="#6b5cff"><title>{`${s.d}: ${formatPrice(s.v)}`}</title></rect>)}
        </svg>
        <div className="adm-hint" style={{ display: "flex", justifyContent: "space-between" }}><span>{series[0]?.d}</span><span>Best day {formatPrice(max === 1 ? 0 : max)}</span><span>{series[series.length - 1]?.d}</span></div>
      </section>
      <div className="adm-grid adm-g2">
        <section className="adm-card"><h2>Best sellers</h2>
          {best.length === 0 ? <p className="adm-hint">No sales in this period yet.</p> : <table className="adm-table"><thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead><tbody>
            {best.map((b) => <tr key={b.slug}><td><Link href={`/admin/products/${b.slug}`}>{b.name}</Link></td><td>{b.units}</td><td><b>{formatPrice(b.pence)}</b></td></tr>)}</tbody></table>}
        </section>
        <section className="adm-card"><h2>Low and sold-out stock</h2>
          {rows.length === 0 ? <p className="adm-hint">Nothing running low.</p> : <table className="adm-table"><thead><tr><th>Product</th><th>Option</th><th>Left</th></tr></thead><tbody>
            {rows.map((x) => <tr key={x.slug + x.option}><td><Link href={`/admin/products/${x.slug}`}>{x.name}</Link></td><td>{x.option || <span className="adm-hint">-</span>}</td><td><span className={`adm-badge ${x.qty === 0 ? "adm-bad" : "adm-warn"}`}>{x.qty === 0 ? "Sold out" : x.qty}</span></td></tr>)}</tbody></table>}
        </section>
      </div>
    </>
  );
}
