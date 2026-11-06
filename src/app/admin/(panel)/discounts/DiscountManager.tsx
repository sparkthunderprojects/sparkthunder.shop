"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDiscountAction, deleteDiscountAction, setDiscountActiveAction } from "../../discount-actions";
import { Field, poundsToPence, useAction } from "../../ui";
import { describeDiscount, type DiscountRow } from "@/lib/discounts";
import { formatPrice } from "@/lib/site";

const blank = { code: "", kind: "percent" as "percent" | "fixed", value: "10", minSpend: "", maxUses: "", franchiseSlug: "", startsAt: "", expiresAt: "", note: "" };

function status(r: DiscountRow) {
  const now = Date.now();
  if (!r.active) return ["Off", "adm-bad"];
  if (r.expires_at && Date.parse(r.expires_at) < now) return ["Expired", "adm-warn"];
  if (r.starts_at && Date.parse(r.starts_at) > now) return ["Scheduled", "adm-warn"];
  if (r.max_uses !== null && r.uses >= r.max_uses) return ["Used up", ""];
  return ["Live", "adm-ok"];
}

export function DiscountManager({ rows, franchises }: { rows: DiscountRow[]; franchises: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState(blank);
  const { pending, run, toast } = useAction();
  const set = (k: keyof typeof blank, v: string) => setF((x) => ({ ...x, [k]: v }));
  const names = Object.fromEntries(franchises.map((x) => [x.slug, x.name]));

  return (
    <>
      <section className="adm-card">
        <h2>New code</h2>
        <form onSubmit={(e) => { e.preventDefault(); run(() => createDiscountAction({
          code: f.code, kind: f.kind, value: f.kind === "fixed" ? poundsToPence(f.value) : Number(f.value), minSpendPence: poundsToPence(f.minSpend), maxUses: f.maxUses ? Number(f.maxUses) : null,
          franchiseSlug: f.franchiseSlug, startsAt: f.startsAt, expiresAt: f.expiresAt, note: f.note,
        }), "Code created", () => { setF(blank); router.refresh(); }); }}>
          <div className="adm-grid adm-g3">
            <Field label="Code" hint="Customers type this. Spaces and dashes are ignored."><input className="adm-in" value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WELCOME10" required /></Field>
            <Field label="Type"><select className="adm-sel" value={f.kind} onChange={(e) => set("kind", e.target.value)}><option value="percent">Percentage off</option><option value="fixed">Pounds off</option></select></Field>
            <Field label={f.kind === "percent" ? "Percent off (1-100)" : "Pounds off"}><input className="adm-in" inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} required /></Field>
            <Field label="Minimum spend (£)" hint="Optional. On eligible products."><input className="adm-in" inputMode="decimal" value={f.minSpend} onChange={(e) => set("minSpend", e.target.value)} placeholder="0" /></Field>
            <Field label="Max uses" hint="Leave empty for unlimited."><input className="adm-in" type="number" min={1} value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} /></Field>
            <Field label="Only for universe"><select className="adm-sel" value={f.franchiseSlug} onChange={(e) => set("franchiseSlug", e.target.value)}><option value="">Every universe</option>{franchises.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></Field>
            <Field label="Starts (optional)"><input className="adm-in" type="date" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field>
            <Field label="Ends (optional)"><input className="adm-in" type="date" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></Field>
            <Field label="Note (private)"><input className="adm-in" value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Newsletter launch" /></Field>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}><button className="adm-btn adm-pri" disabled={pending}>{pending ? "Saving..." : "Create code"}</button>{toast}</div>
        </form>
      </section>

      <section className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        {rows.length === 0 ? <p style={{ padding: 18 }} className="adm-hint">No codes yet.</p> : (
          <table className="adm-table"><thead><tr><th>Code</th><th>Offer</th><th>Rules</th><th>Used</th><th>Status</th><th /></tr></thead><tbody>
            {rows.map((r) => { const [label, cls] = status(r); return (
              <tr key={r.id}>
                <td><code style={{ fontWeight: 700 }}>{r.code}</code>{r.note ? <div className="adm-hint">{r.note}</div> : null}</td>
                <td>{describeDiscount(r)}</td>
                <td className="adm-hint">{[r.min_spend_pence ? `min ${formatPrice(r.min_spend_pence)}` : "", r.franchise_slug ? `${names[r.franchise_slug] ?? r.franchise_slug} only` : "all universes", r.starts_at ? `from ${new Date(r.starts_at).toLocaleDateString("en-GB")}` : "", r.expires_at ? `until ${new Date(r.expires_at).toLocaleDateString("en-GB")}` : ""].filter(Boolean).join(" · ")}</td>
                <td>{r.uses}{r.max_uses !== null ? ` / ${r.max_uses}` : ""}</td>
                <td><span className={`adm-badge ${cls}`}>{label}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="adm-btn" disabled={pending} onClick={() => run(() => setDiscountActiveAction(r.id, !r.active), r.active ? "Code turned off" : "Code turned on", () => router.refresh())}>{r.active ? "Turn off" : "Turn on"}</button>{" "}
                  {r.uses === 0 ? <button className="adm-btn" disabled={pending} onClick={() => { if (confirm(`Delete ${r.code}?`)) run(() => deleteDiscountAction(r.id), "Code deleted", () => router.refresh()); }}>Delete</button> : null}
                </td>
              </tr>
            ); })}
          </tbody></table>
        )}
      </section>
    </>
  );
}
