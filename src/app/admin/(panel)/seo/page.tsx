import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { runAudit } from "@/lib/admin/audit";
import { ScoreBadge } from "../../SeoWidgets";

export const metadata = { title: "SEO audit" };

export default async function SeoAudit() {
  const { db } = await requireAdmin("catalogue");
  const a = await runAudit(db);
  const rows = [...a.rows].sort((x, y) => x.score - y.score);
  const grade = a.average >= 90 ? "A" : a.average >= 75 ? "B" : a.average >= 55 ? "C" : "D";
  return (
    <>
      <div className="adm-h"><div><h1>SEO audit</h1><p>Every product, franchise and category scored against the same checks as the editor, including duplicate titles and descriptions across the whole site.</p></div></div>
      <div className="adm-grid adm-g2">
        <section className="adm-card"><h2>Site score</h2>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}><ScoreBadge score={a.average} grade={grade} /><div><b>Grade {grade}</b><div className="adm-hint">{a.rows.filter((r) => !r.noindex).length} indexable pages, {a.rows.filter((r) => r.noindex).length} noindex</div></div></div></section>
        <section className="adm-card"><h2>Most common issues</h2>
          {a.issues.length === 0 ? <p className="adm-hint">Nothing to fix. Nice.</p> : a.issues.map((i) => (
            <div key={i.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #eef0f3" }}><span>{i.label}</span><span className={`adm-badge ${i.status === "fail" ? "adm-bad" : "adm-warn"}`}>{i.count}</span></div>
          ))}</section>
      </div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>Page</th><th>Type</th><th>Score</th><th>Issues to fix</th></tr></thead><tbody>
          {rows.map((r) => (
            <tr key={r.kind + r.slug}>
              <td><Link href={r.href}><b>{r.name}</b></Link>{r.noindex ? <span className="adm-badge" style={{ marginLeft: 6 }}>noindex</span> : null}</td>
              <td>{r.kind}</td>
              <td><span className={`adm-badge ${r.score >= 75 ? "adm-ok" : r.score >= 55 ? "adm-warn" : "adm-bad"}`}>{r.score}</span></td>
              <td>{r.issues.length === 0 ? <span className="adm-hint">All clear</span> : r.issues.slice(0, 4).map((c) => <span key={c.id} className={`adm-badge ${c.status === "fail" ? "adm-bad" : "adm-warn"}`} title={c.hint} style={{ marginRight: 4 }}>{c.label}</span>)}{r.issues.length > 4 ? ` +${r.issues.length - 4}` : ""}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </>
  );
}
