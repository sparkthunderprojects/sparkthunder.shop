"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCollectionAction, saveCollectionAction } from "../../collection-actions";
import { Field, useAction } from "../../ui";
import type { Collection } from "@/lib/types";
import { nowMs } from "@/lib/time";
import { FIELDS, FIELD_LABEL, FLAG_FIELDS, matchesRules, MAX_CONDITIONS, type RuleField, type SmartMap, type SmartRules } from "@/lib/smart-collections";

type Prod = { slug: string; name: string; franchiseSlug: string; categorySlug: string; pricePence: number; comparePricePence: number | null; inStock: boolean; isNew: boolean; isFeatured: boolean; tags: string[] };
type Named = { slug: string; name: string };

type Form = { rules: SmartRules | null; slug: string; name: string; description: string; image: string; launchAt: string; productSlugs: string[]; sortOrder: string; published: boolean; isNew: boolean };
const blank: Form = { rules: null, slug: "", name: "", description: "", image: "", launchAt: "", productSlugs: [], sortOrder: "0", published: true, isNew: true };
// <input type="datetime-local"> works in the admin's own time zone; we store the exact moment.
const toLocal = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); const o = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - o).toISOString().slice(0, 16); };

export function CollectionManager({ collections, products, rules, franchises, categories }: { collections: Collection[]; products: Prod[]; rules: SmartMap; franchises: Named[]; categories: Named[] }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(blank);
  const [q, setQ] = useState("");
  const { pending, run, toast } = useAction();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const shown = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (s: string) => set("productSlugs", f.productSlugs.includes(s) ? f.productSlugs.filter((x) => x !== s) : [...f.productSlugs, s]);
  const edit = (c: Collection) => { setF({ rules: rules[c.slug] ?? null, slug: c.slug, name: c.name, description: c.description, image: c.image, launchAt: toLocal(c.launchAt), productSlugs: c.productSlugs, sortOrder: String(c.sortOrder), published: c.published, isNew: false }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const matched = f.rules ? products.filter((p) => matchesRules(p, f.rules!)) : [];
  const setCond = (i: number, patch: Partial<{ field: RuleField; value: string }>) => setF((x) => x.rules ? { ...x, rules: { ...x.rules, conditions: x.rules.conditions.map((c, k) => (k === i ? { ...c, ...patch, ...(patch.field ? { value: "" } : {}) } : c)) } } : x);
  const listFor = (field: RuleField) => (field === "franchise" ? franchises : field === "category" ? categories : null);

  return (
    <>
      <section className="adm-card">
        <h2>{f.isNew ? "New collection" : `Editing ${f.name}`}</h2>
        <form onSubmit={(e) => { e.preventDefault(); run(() => saveCollectionAction({ ...f, launchAt: f.launchAt ? new Date(f.launchAt).toISOString() : "", rules: f.rules, sortOrder: Number(f.sortOrder) || 0 }), "Collection saved", () => { setF(blank); router.refresh(); }); }}>
          <div className="adm-grid adm-g3">
            <Field label="Name"><input className="adm-in" value={f.name} onChange={(e) => set("name", e.target.value)} required /></Field>
            <Field label="Web address" hint="Leave empty to build it from the name."><input className="adm-in" value={f.slug} disabled={!f.isNew} onChange={(e) => set("slug", e.target.value)} placeholder="winter-drop" /></Field>
            <Field label="Launch date and time" hint="Empty = on sale now. Shown in your own time zone."><input className="adm-in" type="datetime-local" value={f.launchAt} onChange={(e) => set("launchAt", e.target.value)} /></Field>
            <Field label="Image URL (optional)"><input className="adm-in" value={f.image} onChange={(e) => set("image", e.target.value)} placeholder="https://..." /></Field>
            <Field label="Order on the page"><input className="adm-in" type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
            <Field label="Visible on the shop"><label style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 8 }}><input type="checkbox" checked={f.published} onChange={(e) => set("published", e.target.checked)} /> Published</label></Field>
          </div>
          <Field label="Description"><textarea className="adm-in" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <div style={{ border: "1px solid #e3e6ea", borderRadius: 8, padding: 12, margin: "12px 0" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
              <input type="checkbox" checked={f.rules !== null} onChange={(e) => set("rules", e.target.checked ? { match: "all", conditions: [{ field: "franchise", value: "" }] } : null)} /> Fill this collection automatically with rules
            </label>
            <p className="adm-hint" style={{ margin: "4px 0 0" }}>New and changed products join or leave on their own, so you never have to update it by hand.</p>
            {f.rules ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div>Products must match <select className="adm-sel" style={{ width: "auto", display: "inline-block" }} aria-label="Match all or any" value={f.rules.match} onChange={(e) => set("rules", { ...f.rules!, match: e.target.value === "any" ? "any" : "all" })}><option value="all">all of these rules</option><option value="any">any of these rules</option></select></div>
                {f.rules.conditions.map((c, i) => {
                  const list = listFor(c.field);
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <select className="adm-sel" style={{ width: "auto" }} aria-label={`Rule ${i + 1} field`} value={c.field} onChange={(e) => setCond(i, { field: e.target.value as RuleField })}>{FIELDS.map((k) => <option key={k} value={k}>{FIELD_LABEL[k]}</option>)}</select>
                      {FLAG_FIELDS.includes(c.field) ? null : list ? (
                        <select className="adm-sel" style={{ width: "auto" }} aria-label={`Rule ${i + 1} value`} value={c.value} onChange={(e) => setCond(i, { value: e.target.value })}><option value="">Choose...</option>{list.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select>
                      ) : <input className="adm-in" style={{ width: 180 }} aria-label={`Rule ${i + 1} value`} value={c.value} onChange={(e) => setCond(i, { value: e.target.value })} placeholder={c.field.startsWith("price") ? "20" : c.field === "tag" ? "gift" : "mug"} />}
                      <button type="button" className="adm-btn" aria-label={`Remove rule ${i + 1}`} onClick={() => set("rules", { ...f.rules!, conditions: f.rules!.conditions.filter((_, k) => k !== i) })}>Remove</button>
                    </div>
                  );
                })}
                <div><button type="button" className="adm-btn" disabled={f.rules.conditions.length >= MAX_CONDITIONS} onClick={() => set("rules", { ...f.rules!, conditions: [...f.rules!.conditions, { field: "category", value: "" }] })}>Add a rule</button></div>
                <p role="status" style={{ margin: 0 }}><b>{matched.length}</b> {matched.length === 1 ? "product matches" : "products match"} right now{matched.length ? `: ${matched.slice(0, 6).map((m) => m.name).join(", ")}${matched.length > 6 ? ", ..." : ""}` : "."}</p>
              </div>
            ) : null}
          </div>
          {f.rules ? null : <Field label={`Products (${f.productSlugs.length} chosen)`}>
            <input className="adm-in" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
            <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e3e6ea", borderRadius: 8, padding: 8, display: "grid", gap: 4 }}>
              {shown.map((p) => <label key={p.slug} style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={f.productSlugs.includes(p.slug)} onChange={() => toggle(p.slug)} /> {p.name}</label>)}
            </div>
          </Field>}
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <button className="adm-btn adm-pri" disabled={pending}>{pending ? "Saving..." : f.isNew ? "Create collection" : "Save changes"}</button>
            {!f.isNew ? <button type="button" className="adm-btn" onClick={() => setF(blank)}>Cancel</button> : null}
            {toast}
          </div>
        </form>
      </section>
      <section className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        {collections.length === 0 ? <p style={{ padding: 18 }} className="adm-hint">No collections yet.</p> : (
          <table className="adm-table"><thead><tr><th>Collection</th><th>Launch</th><th>Products</th><th>Status</th><th /></tr></thead><tbody>
            {collections.map((c) => { const up = c.launchAt && Date.parse(c.launchAt) > nowMs(); return (
              <tr key={c.slug}>
                <td><b>{c.name}</b><div className="adm-hint">/collections/{c.slug}</div></td>
                <td>{c.launchAt ? new Date(c.launchAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : <span className="adm-hint">On sale now</span>}</td>
                <td>{rules[c.slug] ? <>{products.filter((p) => matchesRules(p, rules[c.slug])).length} <span className="adm-badge">Automatic</span></> : c.productSlugs.length}</td>
                <td><span className={`adm-badge ${!c.published ? "adm-bad" : up ? "adm-warn" : "adm-ok"}`}>{!c.published ? "Hidden" : up ? "Countdown" : "Live"}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="adm-btn" onClick={() => edit(c)}>Edit</button>{" "}
                  <button className="adm-btn" disabled={pending} onClick={() => { if (confirm(`Delete ${c.name}? Its products are not deleted.`)) run(() => deleteCollectionAction(c.slug), "Collection deleted", () => router.refresh()); }}>Delete</button>
                </td>
              </tr>
            ); })}
          </tbody></table>
        )}
      </section>
    </>
  );
}
