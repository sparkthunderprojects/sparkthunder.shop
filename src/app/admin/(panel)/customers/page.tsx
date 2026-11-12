import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { loadCustomers } from "@/lib/admin/customers-data";
import { inSegment, isSegment, matchesSearch, matchesTag, SEGMENT_LABEL, SEGMENTS, type Segment } from "@/lib/customers";
import { formatPrice } from "@/lib/site";

export const metadata = { title: "Customers" };
const PAGE = 50;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "-");

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; segment?: string; tag?: string; page?: string }> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin("customers");
  const all = await loadCustomers(db);
  const seg: Segment = isSegment(sp.segment) ? sp.segment : "all";
  const q = (sp.q ?? "").slice(0, 100), tag = (sp.tag ?? "").slice(0, 30);
  const now = Date.now();
  const list = all.filter((c) => inSegment(c, seg, now) && matchesSearch(c, q) && matchesTag(c, tag))
    .sort((a, b) => b.spendPence - a.spendPence || (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "") || a.email.localeCompare(b.email));
  const page = Math.max(1, Number(sp.page) || 1);
  const shown = list.slice((page - 1) * PAGE, page * PAGE);
  const buyers = all.filter((c) => c.orders > 0);
  const repeatPct = buyers.length ? Math.round((buyers.filter((c) => c.orders >= 2).length / buyers.length) * 100) : 0;
  const avgValue = buyers.length ? Math.round(buyers.reduce((n, c) => n + c.spendPence, 0) / buyers.length) : 0;
  const tags = [...new Set(all.flatMap((c) => c.tags))].sort();
  const link = (over: Record<string, string>) => { const p = new URLSearchParams({ ...(q ? { q } : {}), ...(seg !== "all" ? { segment: seg } : {}), ...(tag ? { tag } : {}), ...over }); return `/admin/customers?${p}` as never; };
  return (
    <>
      <div className="adm-h"><div><h1>Customers</h1><p>Everyone who has ordered, subscribed, reviewed or asked for a return, built from your own data. Open a customer for their orders, notes and tags.</p></div><a className="adm-btn" href="/admin/export/customers" download>Download CSV</a></div>
      <div className="adm-grid adm-g3" style={{ marginBottom: 18 }}>
        {[[String(all.length), "People"], [String(buyers.length), "Have ordered"], [`${repeatPct}%`, "Of buyers ordered again"], [formatPrice(avgValue), "Average lifetime spend per buyer"]].map(([v, l]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>)}
      </div>
      <form method="get" className="adm-card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ flex: "1 1 220px" }}>Search<input className="adm-in" name="q" defaultValue={q} placeholder="Name, email, phone, tag or order number" /></label>
        <label>Group<select className="adm-in" name="segment" defaultValue={seg}>{SEGMENTS.map((s) => <option key={s} value={s}>{SEGMENT_LABEL[s]}</option>)}</select></label>
        <label>Tag<select className="adm-in" name="tag" defaultValue={tag}><option value="">Any</option>{tags.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <button className="adm-btn adm-pri">Search</button>
      </form>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>Customer</th><th>Orders</th><th>Spent</th><th>Last order</th><th>Tags</th></tr></thead><tbody>
          {shown.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/admin/customers/${c.id}`}><b>{c.name || c.email}</b></Link><div className="adm-hint">{c.name ? c.email : ""}{c.subscribed ? " · subscribed" : ""}</div></td>
              <td>{c.orders}</td><td><b>{formatPrice(c.spendPence)}</b></td><td>{date(c.lastOrderAt)}</td>
              <td>{c.tags.map((t) => <span key={t} className="adm-badge" style={{ marginRight: 4 }}>{t}</span>)}</td>
            </tr>
          ))}
          {shown.length === 0 ? <tr><td colSpan={5} className="adm-hint" style={{ padding: 24 }}>{all.length === 0 ? "No customers yet. They appear here after their first order or newsletter sign-up." : "Nobody matches that search."}</td></tr> : null}
        </tbody></table>
      </div>
      <p className="adm-hint" style={{ marginTop: 10 }}>{list.length} {list.length === 1 ? "person" : "people"}{list.length > PAGE ? ` · page ${page} of ${Math.ceil(list.length / PAGE)}` : ""}
        {page > 1 ? <> · <Link href={link({ page: String(page - 1) })}>Previous</Link></> : null}{page * PAGE < list.length ? <> · <Link href={link({ page: String(page + 1) })}>Next</Link></> : null}</p>
    </>
  );
}
