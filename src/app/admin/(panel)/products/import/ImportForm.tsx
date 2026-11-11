"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyImportAction, previewImportAction } from "../../../import-actions";
import type { ImportPlan } from "@/lib/csv-import";

export function ImportForm() {
  const router = useRouter();
  const [csv, setCsv] = useState(""), [file, setFile] = useState("");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, start] = useTransition();
  const work = plan ? plan.updates.length + plan.creates.length : 0;

  return (
    <section className="adm-card" style={{ display: "grid", gap: 12, marginTop: 16 }}>
      <label style={{ display: "grid", gap: 4 }}>CSV file
        <input className="adm-in" type="file" accept=".csv,text/csv" onChange={async (e) => {
          const f = e.target.files?.[0]; setPlan(null); setMsg("");
          if (!f) return;
          setFile(f.name); const text = await f.text(); setCsv(text);
          start(async () => { const r = await previewImportAction(text); if (r.ok) setPlan(r.plan); else setMsg(r.error); });
        }} />
      </label>
      <div role="status" aria-live="polite">{busy && !plan ? "Reading…" : msg}</div>
      {plan ? (
        <>
          <p style={{ margin: 0 }}><b>{file}</b>: {plan.updates.length} to update, {plan.creates.length} to create, {plan.unchanged} already up to date, {plan.errors.length} with problems.</p>
          {plan.errors.length ? (
            <div><b>Problems (these rows will be skipped)</b>
              <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{plan.errors.slice(0, 50).map((e, i) => <li key={i}>Line {e.line}: {e.message}</li>)}{plan.errors.length > 50 ? <li>…and {plan.errors.length - 50} more</li> : null}</ul></div>
          ) : null}
          {plan.updates.length ? (
            <div style={{ overflowX: "auto" }}><b>Changes</b>
              <table className="adm-table"><thead><tr><th>Product</th><th>Change</th></tr></thead><tbody>
                {plan.updates.slice(0, 100).map((u) => (
                  <tr key={u.slug}><td><code>{u.slug}</code></td><td>{u.changes.map((c) => `${c.field}: ${c.from || "(blank)"} → ${c.to || "(blank)"}`).join(" · ")}{u.notes.map((n, i) => <div key={i} className="adm-hint">{n}</div>)}</td></tr>
                ))}
              </tbody></table>
              {plan.updates.length > 100 ? <p className="adm-hint">Showing the first 100.</p> : null}
            </div>
          ) : null}
          {plan.creates.length ? <div><b>New products</b><ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{plan.creates.slice(0, 50).map((c) => <li key={c.line}>{c.name} (<code>{String(c.row.slug)}</code>)</li>)}</ul></div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="adm-btn adm-bolt" disabled={busy || work === 0} onClick={() => { if (!confirm(`Apply ${work} change${work === 1 ? "" : "s"}?`)) return;
              start(async () => { const r = await applyImportAction(csv); if (r.ok) { setMsg(`Done: ${r.updated} updated, ${r.created} created, ${r.skipped} skipped.`); setPlan(null); setCsv(""); router.refresh(); } else setMsg(r.error); }); }}>Apply {work} change{work === 1 ? "" : "s"}</button>
          </div>
        </>
      ) : null}
    </section>
  );
}
