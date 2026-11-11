"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createApiKeyAction, createWebhookAction, deleteWebhookAction, retryDeliveryAction, revokeApiKeyAction, rotateWebhookSecretAction, setWebhookActiveAction, testWebhookAction } from "../../developer-actions";
import { Field, useAction } from "../../ui";
import type { ApiKeyRow } from "@/lib/api/keys";

export type Endpoint = { id: string; url: string; events: string[]; active: boolean; created_at: string };
export type Delivery = { id: string; endpoint_id: string; event: string; status: "pending" | "ok" | "failed"; attempts: number; last_status: number | null; last_error: string; created_at: string };
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "never");

export function DeveloperPanel({ keys, endpoints, deliveries, events }: { keys: ApiKeyRow[]; endpoints: Endpoint[]; deliveries: Delivery[]; events: string[] }) {
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const [name, setName] = useState(""), [write, setWrite] = useState(false);
  const [url, setUrl] = useState(""), [picked, setPicked] = useState<string[]>([]);
  const [shown, setShown] = useState<{ label: string; value: string } | null>(null);
  const host = (u: string) => { try { return new URL(u).host; } catch { return u; } };
  const epUrl = Object.fromEntries(endpoints.map((e) => [e.id, host(e.url)]));

  return (
    <>
      {toast}
      {shown ? (
        <section className="adm-card" role="alert" style={{ borderColor: "#d99" }}>
          <h2>{shown.label}</h2>
          <p>Copy it now and keep it somewhere safe. <b>It will not be shown again.</b></p>
          <input className="adm-in" readOnly value={shown.value} onFocus={(e) => e.currentTarget.select()} style={{ fontFamily: "monospace" }} />
          <p style={{ marginTop: 10 }}><button className="adm-btn" onClick={() => setShown(null)}>I have copied it</button></p>
        </section>
      ) : null}

      <section className="adm-card">
        <h2>API keys</h2>
        <p className="adm-hint">Send a key as <code>Authorization: Bearer &lt;key&gt;</code> to <code>/api/v1/orders</code> and <code>/api/v1/products</code> on your store&rsquo;s own address. 120 requests a minute per key. Full details are in docs/API.md.</p>
        <form onSubmit={(e) => { e.preventDefault(); run(() => createApiKeyAction(name, write), "Key created", (r) => { setShown({ label: "Your new API key", value: r.key }); setName(""); setWrite(false); router.refresh(); }); }}>
          <div className="adm-grid adm-g3">
            <Field label="Name"><input className="adm-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse system" required /></Field>
            <Field label="Permission"><select className="adm-sel" value={write ? "write" : "read"} onChange={(e) => setWrite(e.target.value === "write")}><option value="read">Read only</option><option value="write">Read and change (mark shipped, edit price and stock)</option></select></Field>
          </div>
          <p style={{ marginTop: 12 }}><button className="adm-btn adm-btn-primary" disabled={pending}>Create key</button></p>
        </form>
        <table className="adm-table"><thead><tr><th>Name</th><th>Key</th><th>Permission</th><th>Last used</th><th /></tr></thead><tbody>
          {keys.length ? keys.map((k) => (
            <tr key={k.id}><td>{k.name}</td><td><code>{k.prefix}…</code></td><td>{k.scopes.includes("write") ? "Read and change" : "Read only"}</td><td>{k.revoked_at ? <span className="adm-bad">Revoked</span> : when(k.last_used_at)}</td>
              <td>{k.revoked_at ? null : <button className="adm-btn" disabled={pending} onClick={() => { if (confirm(`Revoke "${k.name}"? Anything using it stops working straight away.`)) run(() => revokeApiKeyAction(k.id), "Key revoked", () => router.refresh()); }}>Revoke</button>}</td></tr>
          )) : <tr><td colSpan={5}>No keys yet.</td></tr>}
        </tbody></table>
      </section>

      <section className="adm-card">
        <h2>Webhooks</h2>
        <p className="adm-hint">We send a signed <code>POST</code> to your address when something happens. Check the <code>X-Spark-Signature</code> header (HMAC-SHA256 of the body with your signing secret). If your server is down we try again up to 6 times over about 14 hours.</p>
        <form onSubmit={(e) => { e.preventDefault(); run(() => createWebhookAction(url, picked), "Webhook added", (r) => { setShown({ label: "Signing secret for this webhook", value: r.secret }); setUrl(""); setPicked([]); router.refresh(); }); }}>
          <Field label="Your address (https only)"><input className="adm-in" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/spark" required /></Field>
          <fieldset style={{ border: 0, padding: 0, margin: "12px 0 0" }}><legend className="adm-lbl">Events (none ticked = all of them)</legend>
            {events.map((ev) => <label key={ev} style={{ display: "inline-flex", gap: 6, marginRight: 16 }}><input type="checkbox" checked={picked.includes(ev)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, ev] : p.filter((x) => x !== ev)))} /> <code>{ev}</code></label>)}
          </fieldset>
          <p style={{ marginTop: 12 }}><button className="adm-btn adm-btn-primary" disabled={pending}>Add webhook</button></p>
        </form>
        <table className="adm-table"><thead><tr><th>Address</th><th>Events</th><th>Status</th><th /></tr></thead><tbody>
          {endpoints.length ? endpoints.map((e) => (
            <tr key={e.id}><td>{host(e.url)}<div className="adm-hint">{e.url}</div></td><td>{e.events.length ? e.events.join(", ") : "All"}</td><td>{e.active ? <span className="adm-ok">On</span> : <span className="adm-bad">Off</span>}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="adm-btn" disabled={pending} onClick={() => run(() => testWebhookAction(e.id), "Test sent: your server answered")}>Send test</button>{" "}
                <button className="adm-btn" disabled={pending} onClick={() => run(() => setWebhookActiveAction(e.id, !e.active), e.active ? "Turned off" : "Turned on", () => router.refresh())}>{e.active ? "Turn off" : "Turn on"}</button>{" "}
                <button className="adm-btn" disabled={pending} onClick={() => { if (confirm("Make a new signing secret? The old one stops working immediately.")) run(() => rotateWebhookSecretAction(e.id), "New secret made", (r) => setShown({ label: "New signing secret", value: r.secret })); }}>New secret</button>{" "}
                <button className="adm-btn" disabled={pending} onClick={() => { if (confirm("Delete this webhook and its history?")) run(() => deleteWebhookAction(e.id), "Deleted", () => router.refresh()); }}>Delete</button></td></tr>
          )) : <tr><td colSpan={4}>No webhooks yet.</td></tr>}
        </tbody></table>
      </section>

      <section className="adm-card">
        <h2>Recent deliveries</h2>
        <table className="adm-table"><thead><tr><th>When</th><th>Event</th><th>To</th><th>Result</th><th /></tr></thead><tbody>
          {deliveries.length ? deliveries.map((d) => (
            <tr key={d.id}><td>{when(d.created_at)}</td><td><code>{d.event}</code></td><td>{epUrl[d.endpoint_id] ?? "removed"}</td>
              <td>{d.status === "ok" ? <span className="adm-ok">Delivered ({d.last_status})</span> : d.status === "failed" ? <span className="adm-bad">Gave up: {d.last_error}</span> : <span className="adm-warn">Retrying (try {d.attempts}){d.last_error ? `: ${d.last_error}` : ""}</span>}</td>
              <td>{d.status !== "ok" ? <button className="adm-btn" disabled={pending} onClick={() => run(() => retryDeliveryAction(d.id), "Tried again", () => router.refresh())}>Try again now</button> : null}</td></tr>
          )) : <tr><td colSpan={5}>Nothing sent yet.</td></tr>}
        </tbody></table>
      </section>
    </>
  );
}
