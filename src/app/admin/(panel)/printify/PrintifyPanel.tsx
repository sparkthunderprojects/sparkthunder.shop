"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { connectPrintifyAction, connectPrintifyWebhookAction, disconnectPrintifyAction, importPrintifyAction } from "../../printify-actions";

type Opt = { slug: string; name: string };
type Status = { token: boolean; shopId: string; webhook: boolean; imported: number };

export function PrintifyPanel({ status, franchises, categories }: { status: Status; franchises: Opt[]; categories: Opt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [token, setToken] = useState(""), [shopId, setShopId] = useState(status.shopId);
  const [shops, setShops] = useState<{ id: string; title: string }[]>([]);
  const [fr, setFr] = useState(franchises[0]?.slug ?? ""), [cat, setCat] = useState(categories[0]?.slug ?? ""), [pub, setPub] = useState(false);
  const [msg, setMsg] = useState("");
  const run = (f: () => Promise<string>) => start(async () => { setMsg("Working…"); try { setMsg(await f()); } catch { setMsg("Something went wrong. Try again."); } router.refresh(); });

  return (
    <>
      <div className="adm-h"><div><h1>Printify</h1><p>Print-on-demand products: bring them in here, and paid orders are sent to Printify to print and post automatically.</p></div></div>
      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 8 }}>{msg}</div>

      <section className="adm-card" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <h2>1. Connect</h2>
        <p style={{ margin: 0 }}>Token: <b>{status.token ? "saved" : "not set"}</b> · Shop: <b>{status.shopId || "not chosen"}</b></p>
        <p className="adm-hint" style={{ margin: 0 }}>In Printify: Account, Connections, API tokens, Generate. Paste it here only; it is stored on the server and never shown again.</p>
        <label style={{ display: "grid", gap: 4 }}>Printify API token<input className="adm-in" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder={status.token ? "•••••••• (leave blank to keep)" : ""} /></label>
        {shops.length > 1 ? <label style={{ display: "grid", gap: 4 }}>Which Printify shop?<select className="adm-in" value={shopId} onChange={(e) => setShopId(e.target.value)}><option value="">Choose…</option>{shops.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.id})</option>)}</select></label>
          : <label style={{ display: "grid", gap: 4 }}>Shop id (optional)<input className="adm-in" value={shopId} onChange={(e) => setShopId(e.target.value)} /><small style={{ opacity: 0.7 }}>Filled in automatically if your account has one shop.</small></label>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="adm-btn adm-bolt" disabled={pending} onClick={() => run(async () => {
            const r = await connectPrintifyAction({ token, shopId });
            if (!r.ok) return r.error;
            setToken(""); setShops(r.shops); setShopId(r.shopId);
            return r.shopId ? "Connected." : "Token works. Choose a shop and press Connect again.";
          })}>Connect</button>
          {status.token ? <button className="adm-btn" disabled={pending} onClick={() => { if (confirm("Disconnect Printify? New orders will no longer be sent for printing.")) run(async () => { const r = await disconnectPrintifyAction(); return r.ok ? "Disconnected." : r.error; }); }}>Disconnect</button> : null}
        </div>
      </section>

      <section className="adm-card" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <h2>2. Import products</h2>
        <p style={{ margin: 0 }}>{status.imported} Printify product{status.imported === 1 ? "" : "s"} in this store. Importing again refreshes prices, options and photos but keeps any wording you have edited, and hides products you removed at Printify.</p>
        <div className="adm-grid adm-g2">
          <label style={{ display: "grid", gap: 4 }}>New products go in franchise<select className="adm-in" value={fr} onChange={(e) => setFr(e.target.value)}>{franchises.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}</select></label>
          <label style={{ display: "grid", gap: 4 }}>and category<select className="adm-in" value={cat} onChange={(e) => setCat(e.target.value)}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> Show new products in the shop straight away (otherwise they arrive hidden for you to check first)</label>
        <div><button className="adm-btn adm-bolt" disabled={pending || !status.token || !status.shopId} onClick={() => run(async () => {
          const r = await importPrintifyAction({ franchiseSlug: fr, categorySlug: cat, publishNew: pub });
          if (!r.ok) return r.error;
          const x = r.result;
          return `Done: ${x.added} added, ${x.updated} updated, ${x.hidden} hidden.${x.skipped.length ? ` Skipped: ${x.skipped.map((s) => `${s.title} (${s.why})`).join("; ")}.` : ""}`;
        })}>Import / refresh from Printify</button></div>
      </section>

      <section className="adm-card" style={{ display: "grid", gap: 12 }}>
        <h2>3. Tracking</h2>
        <p style={{ margin: 0 }}>Tracking updates: <b>{status.webhook ? "connected" : "not connected"}</b></p>
        <p className="adm-hint" style={{ margin: 0 }}>When Printify ships an order, the order is marked shipped here and the customer is emailed their tracking. Press this from your live site (not localhost).</p>
        <div><button className="adm-btn" disabled={pending || !status.token || !status.shopId} onClick={() => run(async () => { const r = await connectPrintifyWebhookAction(); return r.ok ? `Connected. Printify will now report shipments to ${r.url}` : r.error; })}>{status.webhook ? "Re-check tracking connection" : "Connect tracking"}</button></div>
      </section>
    </>
  );
}
