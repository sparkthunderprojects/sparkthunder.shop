import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import type { OrderRow } from "@/lib/shop/fulfil";
import { formatPrice } from "@/lib/site";

export const metadata = { title: "Orders" };
const BADGE = { paid: "adm-warn", shipped: "adm-ok", cancelled: "", attention: "adm-bad" } as const;
const LABEL = { paid: "To ship", shipped: "Shipped", cancelled: "Cancelled", attention: "Needs attention" } as const;

export default async function OrdersPage() {
  const { db } = await requireAdmin();
  const { data } = await db.from("orders").select("*").order("created_at", { ascending: false });
  const orders = (data ?? []) as OrderRow[];
  const toShip = orders.filter((o) => o.status === "paid" && o.items.some((l) => l.type === "product")).length;
  const attention = orders.filter((o) => o.status === "attention").length;
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total_pence - (o.refunded_card_pence ?? 0), 0);
  return (
    <>
      <div className="adm-h"><div><h1>Orders</h1><p>Paid orders from Stripe Checkout. Open an order to ship it or refund it.</p></div><a className="adm-btn" href="/admin/export/orders" download>Download CSV</a></div>
      <div className="adm-grid adm-g3" style={{ marginBottom: 18 }}>
        {[[String(orders.length), "Orders"], [String(toShip), "Waiting to ship"], [String(attention), "Need attention"], [formatPrice(revenue), "Card revenue (after refunds, excl. gift cards)"]].slice(0, 4).map(([v, l]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>)}
      </div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
          {orders.map((o) => (
            <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`}><b>{o.number}</b></Link></td><td>{new Date(o.created_at).toLocaleDateString("en-GB")}</td><td>{o.name || o.email}<div className="adm-hint">{o.email}</div></td>
              <td>{o.items.reduce((n, l) => n + l.qty, 0)}</td><td><b>{formatPrice(o.total_pence)}</b></td><td><span className={`adm-badge ${BADGE[o.status]}`}>{LABEL[o.status]}</span></td></tr>
          ))}
          {orders.length === 0 ? <tr><td colSpan={6} className="adm-hint" style={{ padding: 24 }}>No orders yet.</td></tr> : null}
        </tbody></table>
      </div>
    </>
  );
}
