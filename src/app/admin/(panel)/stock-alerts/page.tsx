import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { withBundleStock } from "@/lib/catalog";
import { productFromRow, type ProductRow } from "@/lib/db/mappers";
import { isAvailable, type AlertRow } from "@/lib/shop/alerts";
import { SendNowButton } from "./SendNowButton";

export const metadata = { title: "Stock alerts" };

export default async function StockAlertsAdmin() {
  const { db } = await requireAdmin("catalogue");
  const [{ data: a }, { data: p }] = await Promise.all([db.from("stock_alerts").select("*"), db.from("products").select("*")]);
  const alerts = (a ?? []) as AlertRow[];
  const products = new Map(withBundleStock(((p ?? []) as ProductRow[]).map(productFromRow)).map((x) => [x.slug, x]));

  const groups = new Map<string, { slug: string; variant: string; waiting: number; notified: number }>();
  for (const x of alerts) {
    const k = `${x.product_slug}::${x.variant}`;
    const g = groups.get(k) ?? { slug: x.product_slug, variant: x.variant, waiting: 0, notified: 0 };
    if (x.notified_at) g.notified++; else g.waiting++;
    groups.set(k, g);
  }
  const rows = [...groups.values()].sort((m, n) => n.waiting - m.waiting || n.notified - m.notified);
  const waiting = rows.reduce((n, r) => n + r.waiting, 0);
  const ready = rows.filter((r) => r.waiting && products.get(r.slug) && isAvailable(products.get(r.slug)!, r.variant)).reduce((n, r) => n + r.waiting, 0);

  return (
    <>
      <div className="adm-h"><div><h1>Stock alerts</h1><p>Fans who asked to be emailed when a sold-out product returns. Restock a product and they are emailed automatically; this list also shows you what people want most.</p></div></div>
      <div className="adm-grid adm-g4" style={{ marginBottom: 18 }}>
        {[[String(waiting), "People waiting"], [String(ready), "Waiting on items now in stock"], [String(rows.reduce((n, r) => n + r.notified, 0)), "Already emailed"]].map(([v, l]) => (
          <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>
        ))}
      </div>
      {ready > 0 ? <div className="adm-card"><p style={{ margin: "0 0 10px" }}><b>{ready} {ready === 1 ? "person is" : "people are"} waiting for something that is in stock.</b> They are emailed when you save a product, or you can send now.</p><SendNowButton /></div> : null}
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        {rows.length === 0 ? <p style={{ padding: 18 }} className="adm-hint">No one has asked for a stock alert yet. The form shows on any sold-out product.</p> : (
          <table className="adm-table"><thead><tr><th>Product</th><th>Option</th><th>Waiting</th><th>Emailed</th><th>Now</th></tr></thead><tbody>
            {rows.map((r) => { const pr = products.get(r.slug); const ok = pr ? isAvailable(pr, r.variant) : false; return (
              <tr key={`${r.slug}::${r.variant}`}>
                <td><Link href={`/admin/products/${r.slug}`}>{pr?.name ?? r.slug}</Link></td>
                <td>{r.variant || <span className="adm-hint">any</span>}</td>
                <td><b>{r.waiting}</b></td><td>{r.notified}</td>
                <td><span className={`adm-badge ${ok ? "adm-ok" : "adm-warn"}`}>{pr ? (ok ? "In stock" : "Sold out") : "Removed"}</span></td>
              </tr>
            ); })}
          </tbody></table>
        )}
      </div>
    </>
  );
}
