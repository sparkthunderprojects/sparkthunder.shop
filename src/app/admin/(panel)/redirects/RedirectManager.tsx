"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addRedirectAction, deleteRedirectAction } from "../../actions";
import { Field, useAction } from "../../ui";
import type { RedirectRow } from "@/lib/admin/repo";

export function RedirectManager({ initial }: { initial: RedirectRow[] }) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState(301);
  const [note, setNote] = useState("");
  const { pending, run, toast } = useAction();
  return (
    <>
      <div className="adm-h"><div><h1>Redirects</h1><p>Old URLs keep their ranking by sending visitors and Google to the new page. Slug changes and deleted products add rules here automatically. Chains are collapsed so there is only ever one hop.</p></div></div>
      <section className="adm-card"><h2>Add a redirect</h2>
        <form className="adm-grid" style={{ gridTemplateColumns: "2fr 2fr 1fr 2fr auto", alignItems: "end" }}
          onSubmit={(e) => { e.preventDefault(); run(() => addRedirectAction(from, to, status, note), "Redirect added", () => { setFrom(""); setTo(""); setNote(""); router.refresh(); }); }}>
          <Field label="From path"><input className="adm-in" placeholder="/old-page" required value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To path or URL"><input className="adm-in" placeholder="/new-page" required value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Type"><select className="adm-sel" value={status} onChange={(e) => setStatus(Number(e.target.value))}><option value={301}>301 permanent</option><option value={302}>302 temporary</option></select></Field>
          <Field label="Note"><input className="adm-in" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <button className="adm-btn adm-pri" disabled={pending}>Add</button>
        </form>{toast}
      </section>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>From</th><th>To</th><th>Type</th><th>Note</th><th /></tr></thead><tbody>
          {initial.map((r) => (
            <tr key={r.id}><td><code>{r.from_path}</code></td><td><code>{r.to_path}</code></td><td><span className="adm-badge">{r.status}</span></td><td className="adm-hint">{r.note}</td>
              <td><button className="adm-btn adm-danger" onClick={() => run(() => deleteRedirectAction(r.id), "Removed", () => router.refresh())}>Remove</button></td></tr>
          ))}
          {initial.length === 0 ? <tr><td colSpan={5} className="adm-hint" style={{ padding: 24 }}>No redirects yet.</td></tr> : null}
        </tbody></table>
      </div>
    </>
  );
}
