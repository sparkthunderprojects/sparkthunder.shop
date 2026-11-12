import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { loadCustomers } from "@/lib/admin/customers-data";
import { formatPrice } from "@/lib/site";
import { NotesForm } from "./NotesForm";

export const metadata = { title: "Customer" };
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "-");
const LABEL = { paid: "To ship", shipped: "Shipped", cancelled: "Cancelled", attention: "Needs attention" } as const;

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin("customers");
  const c = (await loadCustomers(db)).find((x) => x.id === id);
  if (!c) notFound();
  const addr = c.address ? Object.values(c.address).filter(Boolean).join(", ") : "";
  return (
    <>
      <div className="adm-h"><div><h1>{c.name || c.email}</h1><p><Link href="/admin/customers">All customers</Link> · {c.email}{c.phone ? ` · ${c.phone}` : ""}</p></div></div>
      <div className="adm-grid adm-g3" style={{ marginBottom: 18 }}>
        {[[formatPrice(c.spendPence), "Lifetime spend (after refunds)"], [String(c.orders), "Orders"], [formatPrice(c.aovPence), "Average order"], [date(c.firstOrderAt), "First order"], [date(c.lastOrderAt), "Last order"], [String(c.points), "Spark points"]].map(([v, l]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>)}
      </div>
      <div className="adm-grid adm-g2">
        <section className="adm-card">
          <h2>Notes and tags</h2>
          <p className="adm-hint">Private to your team. Tags help you find groups later (for example vip, wholesale, press).</p>
          <NotesForm id={c.id} tags={c.tags.join(", ")} notes={c.notes} />
        </section>
        <section className="adm-card">
          <h2>Details</h2>
          <p><b>Newsletter:</b> {c.subscribed ? "Subscribed" : "Not subscribed"}</p>
          <p><b>Returns requested:</b> {c.returns}</p>
          <p><b>Reviews written:</b> {c.reviews}</p>
          <p><b>Latest delivery address:</b> {addr || "None on file"}</p>
        </section>
      </div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>
          {c.orderList.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`}><b>{o.number}</b></Link></td><td>{date(o.at)}</td><td>{formatPrice(o.totalPence)}</td><td>{LABEL[o.status]}</td></tr>)}
          {c.orderList.length === 0 ? <tr><td colSpan={4} className="adm-hint" style={{ padding: 24 }}>No orders yet.</td></tr> : null}
        </tbody></table>
      </div>
    </>
  );
}
