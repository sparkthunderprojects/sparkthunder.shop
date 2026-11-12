"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelScheduleAction, createScheduleAction, runScheduleNowAction } from "../../schedule-actions";
import { Field, useAction } from "../../ui";
import { describeSchedule, isProductAction, LABELS, SCHEDULE_ACTIONS, type ScheduleAction, type ScheduledRow } from "@/lib/schedule";

type Opt = { slug: string; name: string };
const blank = { action: "show_product" as ScheduleAction, target: "", runAt: "", endsAt: "", percent: "20" };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");
const STATUS: Record<ScheduledRow["status"], [string, string]> = { pending: ["Waiting", "adm-warn"], live: ["Running", "adm-ok"], done: ["Done", "adm-ok"], failed: ["Failed", "adm-bad"], cancelled: ["Cancelled", "adm-bad"] };

export function ScheduleManager({ rows, products, collections }: { rows: ScheduledRow[]; products: Opt[]; collections: Opt[] }) {
  const router = useRouter();
  const [f, setF] = useState(blank);
  const { pending, run, toast } = useAction();
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }));
  const options = isProductAction(f.action) ? products : collections;
  const names = Object.fromEntries([...products, ...collections].map((o) => [o.slug, o.name]));
  const iso = (v: string) => (v ? new Date(v).toISOString() : ""); // the browser knows the admin's own time zone
  const hint = f.action === "sale" ? "Prices go back by themselves at the end time." : f.action.startsWith("show") ? "Optional: hide it again at this time." : "Optional: show it again at this time.";

  return (
    <>
      <section className="adm-card">
        <h2>Schedule a change</h2>
        <form onSubmit={(e) => { e.preventDefault(); run(() => createScheduleAction({ action: f.action, target: f.target, runAt: iso(f.runAt), endsAt: iso(f.endsAt), percentOff: Number(f.percent) }), "Scheduled", () => { setF(blank); router.refresh(); }); }}>
          <div className="adm-grid adm-g3">
            <Field label="What"><select className="adm-sel" value={f.action} onChange={(e) => setF((x) => ({ ...x, action: e.target.value as ScheduleAction, target: "" }))}>{SCHEDULE_ACTIONS.map((a) => <option key={a} value={a}>{LABELS[a]}</option>)}</select></Field>
            <Field label={isProductAction(f.action) ? "Product" : "Collection"}><select className="adm-sel" value={f.target} onChange={(e) => set("target", e.target.value)} required><option value="">Choose...</option>{options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></Field>
            {f.action === "sale" ? <Field label="Percent off (1-90)"><input className="adm-in" inputMode="numeric" value={f.percent} onChange={(e) => set("percent", e.target.value)} required /></Field> : null}
            <Field label="Starts"><input className="adm-in" type="datetime-local" value={f.runAt} onChange={(e) => set("runAt", e.target.value)} required /></Field>
            <Field label={f.action === "sale" ? "Ends" : "Ends (optional)"} hint={hint}><input className="adm-in" type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} required={f.action === "sale"} /></Field>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}><button className="adm-btn adm-pri" disabled={pending}>{pending ? "Saving..." : "Schedule it"}</button>{toast}</div>
        </form>
      </section>

      <section className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "12px 18px", display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className="adm-btn" disabled={pending} onClick={() => run(async () => { const r = await runScheduleNowAction(); return r.ok ? { ok: true as const } : r; }, "Applied anything that was due", () => router.refresh())}>Apply anything due now</button>
          <span className="adm-hint">Normally the scheduler does this every 30 minutes.</span>
        </div>
        {rows.length === 0 ? <p style={{ padding: 18 }} className="adm-hint">Nothing scheduled yet.</p> : (
          <table className="adm-table"><thead><tr><th>Change</th><th>Starts</th><th>Ends</th><th>Status</th><th>Result</th><th /></tr></thead><tbody>
            {rows.map((r) => { const [label, cls] = STATUS[r.status]; return (
              <tr key={r.id}>
                <td><b>{describeSchedule(r)}</b>{names[r.target] ? <div className="adm-hint">{names[r.target]}</div> : null}</td>
                <td suppressHydrationWarning>{when(r.run_at)}</td><td suppressHydrationWarning>{when(r.ends_at) || "-"}</td>
                <td><span className={`adm-pill ${cls}`}>{label}</span></td><td className="adm-hint">{r.result}</td>
                <td>{r.status === "pending" ? <button type="button" className="adm-btn" disabled={pending} onClick={() => run(() => cancelScheduleAction(r.id), "Cancelled", () => router.refresh())}>Cancel</button> : null}</td>
              </tr>); })}
          </tbody></table>
        )}
      </section>
    </>
  );
}
