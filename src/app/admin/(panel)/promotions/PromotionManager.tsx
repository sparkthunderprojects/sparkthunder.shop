"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPromotionAction, deletePromotionAction, setPromotionActiveAction } from "../../promotion-actions";
import { Field, poundsToPence, useAction } from "../../ui";
import { describePromotion, type PromotionRow } from "@/lib/promotions";

const blank = { name: "", kind: "percent" as "percent" | "buy_x_get_y" | "free_shipping", value: "10", buy: "2", get: "1", minSpend: "", franchiseSlug: "", categorySlug: "", stacks: false, startsAt: "", expiresAt: "" };
type Opt = { slug: string; name: string };

function status(r: PromotionRow) {
  const now = Date.now();
  if (!r.active) return ["Off", "adm-bad"];
  if (r.expires_at && Date.parse(r.expires_at) < now) return ["Ended", "adm-warn"];
  if (r.starts_at && Date.parse(r.starts_at) > now) return ["Scheduled", "adm-warn"];
  return ["Live", "adm-ok"];
}

export function PromotionManager({ rows, franchises, categories }: { rows: PromotionRow[]; franchises: Opt[]; categories: Opt[] }) {
  const router = useRouter();
  const [f, setF] = useState(blank);
  const { pending, run, toast } = useAction();
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }));
  const fr = Object.fromEntries(franchises.map((x) => [x.slug, x.name])), ca = Object.fromEntries(categories.map((x) => [x.slug, x.name]));

  return (
    <>
      <section className="adm-card">
        <h2>New offer</h2>
        <form onSubmit={(e) => { e.preventDefault(); run(() => createPromotionAction({
          name: f.name, kind: f.kind, value: f.kind === "buy_x_get_y" ? Number(f.value || 100) : Number(f.value), buyQty: Number(f.buy), getQty: Number(f.get), minSpendPence: poundsToPence(f.minSpend),
          franchiseSlug: f.franchiseSlug, categorySlug: f.categorySlug, stacks: f.stacks, startsAt: f.startsAt, expiresAt: f.expiresAt,
        }), "Offer created", () => { setF(blank); router.refresh(); }); }}>
          <div className="adm-grid adm-g3">
            <Field label="Name customers see"><input className="adm-in" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Buy 2 get 1 free" required /></Field>
            <Field label="Type"><select className="adm-sel" value={f.kind} onChange={(e) => { const k = e.target.value as typeof f.kind; setF((x) => ({ ...x, kind: k, value: k === "buy_x_get_y" ? "100" : "10" })); }}>
              <option value="percent">Percent off</option><option value="buy_x_get_y">Buy X, get Y</option><option value="free_shipping">Free delivery</option></select></Field>
            {f.kind === "percent" ? <Field label="Percent off (1-100)"><input className="adm-in" inputMode="numeric" value={f.value} onChange={(e) => set("value", e.target.value)} required /></Field> : null}
            {f.kind === "buy_x_get_y" ? (<>
              <Field label="Customer buys"><input className="adm-in" type="number" min={1} max={20} value={f.buy} onChange={(e) => set("buy", e.target.value)} /></Field>
              <Field label="and gets"><input className="adm-in" type="number" min={1} max={20} value={f.get} onChange={(e) => set("get", e.target.value)} /></Field>
              <Field label="% off those extra items" hint="100 = free. The cheapest items in each group are the ones discounted."><input className="adm-in" inputMode="numeric" value={f.value} onChange={(e) => set("value", e.target.value)} /></Field>
            </>) : null}
            <Field label="Minimum spend (£)" hint="Optional, on eligible products."><input className="adm-in" inputMode="decimal" value={f.minSpend} onChange={(e) => set("minSpend", e.target.value)} placeholder="0" /></Field>
            <Field label="Only for universe"><select className="adm-sel" value={f.franchiseSlug} onChange={(e) => set("franchiseSlug", e.target.value)}><option value="">Every universe</option>{franchises.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></Field>
            <Field label="Only for category"><select className="adm-sel" value={f.categorySlug} onChange={(e) => set("categorySlug", e.target.value)}><option value="">Every category</option>{categories.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></Field>
            <Field label="Starts (optional)"><input className="adm-in" type="date" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field>
            <Field label="Ends (optional)"><input className="adm-in" type="date" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></Field>
          </div>
          {f.kind !== "free_shipping" ? <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}><input type="checkbox" checked={f.stacks} onChange={(e) => set("stacks", e.target.checked)} /> Allow a discount code on top (otherwise customers get whichever is bigger)</label> : null}
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}><button className="adm-btn adm-pri" disabled={pending}>{pending ? "Saving..." : "Create offer"}</button>{toast}</div>
        </form>
      </section>

      <section className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        {rows.length === 0 ? <p style={{ padding: 18 }} className="adm-hint">No automatic offers yet.</p> : (
          <table className="adm-table"><thead><tr><th>Offer</th><th>What it does</th><th>Rules</th><th>Status</th><th /></tr></thead><tbody>
            {rows.map((r) => { const [label, cls] = status(r); return (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td>{describePromotion(r)}</td>
                <td className="adm-hint">{[r.franchise_slug ? `${fr[r.franchise_slug] ?? r.franchise_slug} only` : "all universes", r.category_slug ? `${ca[r.category_slug] ?? r.category_slug} only` : "", r.kind !== "free_shipping" ? (r.stacks_with_codes ? "codes stack" : "best of offer or code") : "", r.starts_at ? `from ${new Date(r.starts_at).toLocaleDateString("en-GB")}` : "", r.expires_at ? `until ${new Date(r.expires_at).toLocaleDateString("en-GB")}` : ""].filter(Boolean).join(" · ")}</td>
                <td><span className={`adm-badge ${cls}`}>{label}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="adm-btn" disabled={pending} onClick={() => run(() => setPromotionActiveAction(r.id, !r.active), r.active ? "Offer turned off" : "Offer turned on", () => router.refresh())}>{r.active ? "Turn off" : "Turn on"}</button>{" "}
                  <button className="adm-btn" disabled={pending} onClick={() => { if (confirm(`Delete "${r.name}"? Past orders keep their record.`)) run(() => deletePromotionAction(r.id), "Offer deleted", () => router.refresh()); }}>Delete</button>
                </td>
              </tr>
            ); })}
          </tbody></table>
        )}
      </section>
    </>
  );
}
