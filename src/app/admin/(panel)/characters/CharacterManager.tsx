"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCharactersAction } from "../../character-actions";
import { MediaPicker } from "../../MediaPicker";
import { Field, useAction } from "../../ui";
import { cleanSlug, type CharacterEntry, type CharacterProfile } from "@/lib/character-config";
import type { MediaItem } from "@/lib/admin/repo";

type Row = CharacterProfile & { count: number };
const toRow = (c: CharacterEntry): Row => ({ slug: c.slug, name: c.name, franchiseSlug: c.franchiseSlug, image: c.image, featured: c.featured, blurb: c.blurb, count: c.count });

export function CharacterManager({ initial, franchises, media }: { initial: CharacterEntry[]; franchises: { slug: string; name: string }[]; media: MediaItem[] }) {
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [picking, setPicking] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const unsaved = initial.filter((c) => !c.configured).length;
  const patch = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => setRows((r) => { const a = [...r], j = i + d; if (j < 0 || j >= a.length) return r; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const add = () => {
    const name = newName.trim(); if (!name) return;
    const slug = cleanSlug(name);
    if (rows.some((r) => r.slug === slug)) return;
    setRows((r) => [...r, { slug, name, franchiseSlug: franchises[0]?.slug ?? "", image: "", featured: false, blurb: "", count: 0 }]);
    setNewName("");
  };
  const save = () => run(() => saveCharactersAction(rows.map(({ count: _c, ...p }) => p)), "Characters saved.", () => router.refresh());

  return (
    <>
      <div className="adm-h"><div><h1>Characters</h1><p>Set up the characters shoppers can browse. Link a product to a character by adding the tag <code>character:name</code> (for example <code>character:black-ronin</code>) on the product page. Characters with at least one product appear on the home page and on their franchise page.</p></div></div>

      <section className="adm-card"><h2>Add a character</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px" }}><Field label="Name"><input className="adm-in" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} /></Field></div>
          <button className="adm-btn adm-bolt" onClick={add} disabled={!newName.trim()}>Add</button>
        </div>
        {unsaved > 0 ? <p className="adm-hint" style={{ marginTop: 8 }}>{unsaved} {unsaved === 1 ? "character is" : "characters are"} already in your product tags and listed below. Save to give them portraits and a franchise.</p> : null}
      </section>

      <section className="adm-card"><h2>Your characters ({rows.length})</h2>
        {rows.length === 0 ? <p className="adm-hint">No characters yet. Add one above.</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {rows.map((r, i) => (
              <li key={r.slug} data-character-row={r.slug} style={{ border: "1px solid #d5d9de", borderRadius: 8, padding: 12, display: "grid", gridTemplateColumns: "88px 1fr", gap: 12 }}>
                <div>
                  <button type="button" className="adm-btn" aria-label={`Choose a portrait for ${r.name}`} onClick={() => setPicking(i)} style={{ width: 88, height: 112, padding: 0, background: "#16161c", display: "grid", placeItems: "center", overflow: "hidden" }}>
                    {r.image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={r.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom" }} />
                      : <span style={{ color: "#fff", fontSize: 12 }}>Add portrait</span>}
                  </button>
                  {r.image ? <button type="button" className="adm-btn" style={{ marginTop: 6, width: 88 }} onClick={() => patch(i, { image: "" })}>Remove</button> : null}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="adm-grid adm-g2">
                    <Field label="Name"><input className="adm-in" value={r.name} onChange={(e) => patch(i, { name: e.target.value })} /></Field>
                    <Field label="Franchise">
                      <select className="adm-in" value={r.franchiseSlug} onChange={(e) => patch(i, { franchiseSlug: e.target.value })}>
                        <option value="">None</option>
                        {franchises.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Short line (optional)" hint={`Product tag: character:${r.slug}  |  ${r.count} ${r.count === 1 ? "product" : "products"}`}><input className="adm-in" value={r.blurb} maxLength={300} onChange={(e) => patch(i, { blurb: e.target.value })} /></Field>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={r.featured} onChange={(e) => patch(i, { featured: e.target.checked })} /> Show on the home page</label>
                    <span style={{ flex: 1 }} />
                    <button className="adm-btn" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>&uarr;</button>
                    <button className="adm-btn" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>&darr;</button>
                    <button className="adm-btn" onClick={() => { if (confirm(`Remove ${r.name} from the list? Products keep their tag.`)) setRows((x) => x.filter((_, k) => k !== i)); }}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <button className="adm-btn adm-bolt" disabled={pending} onClick={save}>{pending ? "Saving..." : "Save characters"}</button>{toast}
        </div>
      </section>

      {picking !== null ? <MediaPicker media={media} trim onPick={(m) => { patch(picking, { image: m.url }); setPicking(null); }} onClose={() => setPicking(null)} /> : null}
    </>
  );
}
