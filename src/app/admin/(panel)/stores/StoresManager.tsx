"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveStoreRecordAction, switchStoreAction } from "../../stores-actions";
import type { StoreRow } from "@/lib/db/stores";

function Row({ s, current, create }: { s?: StoreRow; current?: boolean; create?: boolean }) {
  const router = useRouter();
  const [id, setId] = useState(s?.id ?? "");
  const [name, setName] = useState(s?.name ?? "");
  const [domains, setDomains] = useState((s?.domains ?? []).join(", "));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setMsg("");
    const r = await saveStoreRecordAction({ id, name, domains, create });
    setBusy(false);
    if (!r.ok) { setMsg(r.error); return; }
    if (create) { await switchStoreAction(id.trim().toLowerCase()); setId(""); setName(""); setDomains(""); }
    setMsg("Saved."); router.refresh();
  };
  return (
    <div className="adm-card" style={{ display: "grid", gap: 8, marginBottom: 12 }}>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
        <label>Store ID{create ? "" : " (fixed)"}<input value={id} disabled={!create} onChange={(e) => setId(e.target.value)} placeholder="misspetty" /></label>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Miss Petty" /></label>
      </div>
      <label>Domains (comma separated; each domain belongs to one store)<input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="misspetty.com, www.misspetty.com" /></label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" className="adm-btn" disabled={busy} onClick={save}>{create ? "Create store" : "Save"}</button>
        {!create && !current ? <button type="button" className="adm-btn" onClick={async () => { await switchStoreAction(id); router.refresh(); }}>Edit this store</button> : null}
        {current ? <b>Editing now</b> : null}
        {s?.is_default ? <small>Default store (used for unknown hosts)</small> : null}
        <span role="status">{msg}</span>
      </div>
    </div>
  );
}

export function StoresManager({ stores, current }: { stores: StoreRow[]; current: string }) {
  return (
    <>
      <div className="adm-h"><div><h1>Stores</h1><p>Every store on the platform. Each has its own products, orders, customers, design and SEO, and is shown on its own domains. Use the switcher in the sidebar to choose which one you are editing.</p></div></div>
      {stores.map((s) => <Row key={s.id} s={s} current={s.id === current} />)}
      <h2>Add a store</h2>
      <Row create />
    </>
  );
}
