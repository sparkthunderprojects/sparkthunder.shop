import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { currentStoreId, listStores } from "@/lib/db/stores";
import { loadLaunch } from "@/lib/store-launch-data";
import type { LaunchGroup } from "@/lib/store-launch";

export const metadata = { title: "Launch checklist" };
const GROUPS: LaunchGroup[] = ["Brand", "Selling", "Money and email", "Shipping", "Legal"];

export default async function LaunchPage() {
  await requireAdmin();
  const id = await currentStoreId();
  const store = (await listStores()).find((s) => s.id === id);
  const r = await loadLaunch(id, store?.domains ?? []);
  if (!r) return <div className="adm-card"><p>The checklist needs the database connection, which isn&apos;t available right now.</p></div>;
  const { checks, score } = r;
  return (
    <>
      <div className="adm-h"><div><h1>Launch checklist: {store?.name ?? id}</h1><p>What this store still needs before it can take real orders. Required items must be done; the rest are recommended.</p></div></div>
      <div className="adm-card" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div className="adm-stat">{score.requiredDone}/{score.requiredTotal}</div>
        <div><b>{score.ready ? "Ready to launch" : "Not ready yet"}</b><div className="adm-hint">{score.ready ? `Every required step is done. ${score.total - score.done} recommended item(s) left.` : `${score.requiredTotal - score.requiredDone} required step(s) left.`}</div></div>
        <div aria-hidden style={{ flex: "1 1 200px", height: 10, background: "#e3e6ea", borderRadius: 5, overflow: "hidden" }}><div style={{ width: `${score.percent}%`, height: "100%", background: score.ready ? "#1f9d55" : "#6b5cff" }} /></div>
      </div>
      {GROUPS.map((g) => {
        const items = checks.filter((c) => c.group === g);
        if (!items.length) return null;
        return (
          <section key={g} className="adm-card"><h2>{g}</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {items.map((c) => (
                <li key={c.id} data-check={c.id} data-ok={c.ok} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span className={`adm-badge ${c.ok ? "adm-ok" : c.required ? "adm-bad" : "adm-warn"}`} style={{ minWidth: 24, textAlign: "center" }} aria-label={c.ok ? "Done" : c.required ? "Required" : "Recommended"}>{c.ok ? "✓" : c.required ? "!" : "•"}</span>
                  <div style={{ flex: 1 }}><b>{c.label}</b>{!c.required && !c.ok ? <span className="adm-hint"> (recommended)</span> : null}<div className="adm-hint" style={{ marginTop: 0 }}>{c.detail}</div></div>
                  {c.ok ? null : <Link className="adm-btn" href={c.href as never}>Fix</Link>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
