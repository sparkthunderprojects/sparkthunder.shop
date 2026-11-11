import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { overviewByStore, type OrderLite } from "@/lib/admin/reporting";
import { serviceClient } from "@/lib/db/clients";
import { listStores } from "@/lib/db/stores";
import { formatPrice } from "@/lib/site";

export const metadata = { title: "All stores" };
const RANGES = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"]] as const;

export default async function OverviewPage({ searchParams }: PageProps<"/admin/overview">) {
  const admin = await requireAdmin("reports");
  if (admin.access !== "*") redirect("/admin"); // owners only: this reads every store
  const sp = await searchParams;
  const days = Number(RANGES.find(([k]) => k === sp.range)?.[0] ?? 30);
  const stores = await listStores();
  const db = serviceClient("*");
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data } = db ? await db.from("orders").select("store_id, status, total_pence, discount_pence, email, items, created_at, refunded_card_pence, fulfilled_at").gte("created_at", since) : { data: [] };
  const rows = overviewByStore(stores.map((s) => s.id), (data ?? []) as (OrderLite & { store_id: string })[], days);
  const name = new Map(stores.map((s) => [s.id, s.name]));
  const total = rows.reduce((n, r) => ({ orders: n.orders + r.orders, revenue: n.revenue + r.revenue, refunded: n.refunded + r.refunded }), { orders: 0, revenue: 0, refunded: 0 });
  return (
    <>
      <div className="adm-h"><div><h1>All stores</h1><p>Every store side by side. Revenue is card payments kept after refunds. Problems count orders needing attention or stuck unfinished.</p></div>
        <div style={{ display: "flex", gap: 6 }}>{RANGES.map(([k, l]) => <Link key={k} className={`adm-btn ${Number(k) === days ? "adm-pri" : ""}`} href={`/admin/overview?range=${k}`}>{l}</Link>)}</div></div>
      <div className="adm-grid adm-g3" style={{ marginBottom: 18 }}>
        {[[formatPrice(total.revenue), "Revenue, all stores"], [String(total.orders), "Orders, all stores"], [formatPrice(total.refunded), "Refunded"]].map(([v, l]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>)}
      </div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>Store</th><th>Orders</th><th>Revenue</th><th>Refunded</th><th>Problems</th></tr></thead><tbody>
          {rows.map((r) => (
            <tr key={r.storeId}>
              <td><b>{name.get(r.storeId) ?? r.storeId}</b><div className="adm-hint">{r.storeId}</div></td>
              <td>{r.orders}</td><td><b>{formatPrice(r.revenue)}</b></td><td>{r.refunded ? formatPrice(r.refunded) : <span className="adm-hint">-</span>}</td>
              <td>{r.attention + r.unfinished ? <span className="adm-badge adm-bad">{r.attention + r.unfinished}</span> : <span className="adm-badge adm-ok">0</span>}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </>
  );
}
