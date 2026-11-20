import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { runAudit } from "@/lib/admin/audit";
import { counts } from "@/lib/admin/repo";
import { effectiveStatus } from "@/lib/giftcards/format";
import { listCards } from "@/lib/giftcards/ledger";
import { formatPrice } from "@/lib/site";
import { ScoreBadge } from "../SeoWidgets";
import { buildOverview } from "@/lib/analytics";
import { can } from "@/lib/admin/roles";
import { permsHere } from "@/lib/admin/auth";
import { nowMs } from "@/lib/time";
import type { OrderRow } from "@/lib/shop/fulfil";
import { StatCard, SalesChart } from "./analytics/Charts";

export const metadata = { title: "Home" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdmin(), { db } = admin;
  const showSales = can(await permsHere(admin), "reports");
  const denied = (await searchParams).denied;
  const [audit, c, cards] = await Promise.all([runAudit(db), counts(db), listCards(db).catch(() => [])]);
  const giftOwed = cards.filter((g) => effectiveStatus(g) === "active").reduce((n, g) => n + g.balance_pence, 0);
  const grade = audit.average >= 90 ? "A" : audit.average >= 75 ? "B" : audit.average >= 55 ? "C" : "D";
  const low = audit.products.filter((p) => p.trackStock && (p.stockQty ?? 0) <= (p.lowStockThreshold ?? 3));
  const drafts = audit.products.filter((p) => p.published === false).length;
  const worst = [...audit.rows].filter((r) => !r.noindex).sort((a, b) => a.score - b.score).slice(0, 6);
  const stats: [string, number][] = [["Products", audit.products.length], ["Drafts", drafts], ["Franchises", audit.franchises.length], ["Categories", audit.categories.length], ["Images", c.media], ["Redirects", c.redirects]];
  const giftStat = formatPrice(giftOwed);
  const now = nowMs();
  const ov = showSales ? buildOverview(((await db.from("orders").select("*")).data ?? []) as OrderRow[], { since: now - 30 * 86400000, until: now + 1, compare: true }) : null;
  return (
    <>
      {denied ? <p role="alert" className="adm-card" style={{ borderColor: "#c0392b" }}>Your role does not include that part of the admin. Ask a store manager or owner if you need it.</p> : null}
      <div className="adm-h"><div><h1>Home</h1><p>How your store is doing, and what needs a look.</p></div>
        <Link className="adm-btn adm-bolt" href="/admin/products/new">Add product</Link></div>
      {ov ? (
        <section className="adm-card" style={{ padding: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 0" }}><h2 style={{ margin: 0 }}>Last 30 days</h2><Link className="adm-btn" href="/admin/analytics">View analytics</Link></div>
          <div className="adm-grid adm-g4" style={{ padding: 20 }}>
            <StatCard label="Sales" value={formatPrice(ov.now.value)} now={ov.now.value} before={ov.before?.value} />
            <StatCard label="Orders" value={String(ov.now.orders)} now={ov.now.orders} before={ov.before?.orders} />
            <StatCard label="Average order" value={formatPrice(ov.now.aov)} now={ov.now.aov} before={ov.before?.aov} />
            <StatCard label="New customers" value={String(ov.now.newCustomers)} now={ov.now.newCustomers} before={ov.before?.newCustomers} />
          </div>
          <div style={{ padding: "0 20px 16px" }}><SalesChart days={ov.days} ariaLabel="Sales and orders in the last 30 days" /></div>
        </section>
      ) : null}
      <div className="adm-grid adm-g3" style={{ marginBottom: 18 }}>
        {stats.map(([l, n]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{n}</div><div className="adm-stat-l">{l}</div></div>)}
        <Link href="/admin/gift-cards" className="adm-card" style={{ margin: 0, textDecoration: "none" }}><div className="adm-stat">{giftStat}</div><div className="adm-stat-l">Gift card balance outstanding</div></Link>
      </div>
      <div className="adm-grid adm-g2">
        <section className="adm-card">
          <h2>SEO health</h2>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
            <ScoreBadge score={audit.average} grade={grade} />
            <div><b>Average score across indexable pages</b><div className="adm-hint">Grade {grade}. <Link href="/admin/seo">Open the full audit</Link></div></div>
          </div>
          {audit.issues.length === 0 ? <p className="adm-hint">No issues found.</p> : audit.issues.slice(0, 6).map((i) => (
            <div key={i.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef0f3" }}>
              <span>{i.label}</span><span className={`adm-badge ${i.status === "fail" ? "adm-bad" : "adm-warn"}`}>{i.count} page{i.count === 1 ? "" : "s"}</span>
            </div>
          ))}
        </section>
        <section className="adm-card">
          <h2>Pages needing the most love</h2>
          {worst.map((r) => (
            <div key={r.kind + r.slug} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px solid #eef0f3" }}>
              <Link href={r.href}>{r.name} <span className="adm-hint">({r.kind})</span></Link>
              <span className={`adm-badge ${r.score >= 75 ? "adm-ok" : r.score >= 55 ? "adm-warn" : "adm-bad"}`}>{r.score}</span>
            </div>
          ))}
        </section>
        <section className="adm-card">
          <h2>Low stock</h2>
          {low.length === 0 ? <p className="adm-hint">Nothing running low. Turn on stock tracking in a product to see alerts here.</p> : low.map((p) => (
            <div key={p.slug} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef0f3" }}>
              <Link href={`/admin/products/${p.slug}`}>{p.name}</Link><span className="adm-badge adm-bad">{p.stockQty ?? 0} left</span>
            </div>
          ))}
        </section>
        <section className="adm-card">
          <h2>Quick links</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <Link className="adm-btn" href="/admin/media">Upload product photos</Link>
            <Link className="adm-btn" href="/admin/redirects">Manage redirects</Link>
            <Link className="adm-btn" href="/admin/settings">Search engine settings and verification</Link>
            <a className="adm-btn" href="/sitemap.xml" target="_blank" rel="noreferrer">View sitemap.xml</a>
          </div>
        </section>
      </div>
    </>
  );
}
