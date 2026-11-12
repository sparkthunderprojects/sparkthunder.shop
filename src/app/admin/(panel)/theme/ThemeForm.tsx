"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyPresetAction, saveThemeAction } from "../../theme-actions";
import { Field, useAction } from "../../ui";
import { CARDS, FOOTERS, HEADERS, LABELS, PRESETS, PRODUCT_PAGES, SECTION_LABEL, type ThemeLayout } from "@/lib/theme-config";

function Pick<T extends string>({ label, value, list, labels, onChange }: { label: string; value: T; list: readonly T[]; labels: Record<T, string>; onChange: (v: T) => void }) {
  return <Field label={label}><select className="adm-in" value={value} onChange={(e) => onChange(e.target.value as T)}>{list.map((k) => <option key={k} value={k}>{labels[k]}</option>)}</select></Field>;
}

export function ThemeForm({ initial, original }: { initial: ThemeLayout; original: boolean }) {
  const [t, setT] = useState(initial);
  // After a preset is applied the server sends new settings; show them without losing the "Applied" message.
  const [seen, setSeen] = useState(JSON.stringify(initial));
  if (JSON.stringify(initial) !== seen) { setSeen(JSON.stringify(initial)); setT(initial); }
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const set = <K extends keyof ThemeLayout>(k: K, v: ThemeLayout[K]) => setT((x) => ({ ...x, [k]: v }));
  const move = (i: number, d: -1 | 1) => setT((x) => { const h = [...x.home], j = i + d; if (j < 0 || j >= h.length) return x; [h[i], h[j]] = [h[j], h[i]]; return { ...x, home: h }; });
  const toggle = (i: number, on: boolean) => setT((x) => ({ ...x, home: x.home.map((s, k) => (k === i ? { ...s, on } : s)) }));

  return (
    <>
      <div className="adm-h"><div><h1>Theme and layout</h1><p>How this store is laid out. Colours, fonts and the logo are under Brand and design. Each store keeps its own choices.</p></div></div>

      <section className="adm-card"><h2>Start from a preset</h2>
        <p className="adm-hint">Sets colours, type, corners and layout together. Your store name, logo and wording are kept. You can change anything afterwards.</p>
        <div className="adm-grid adm-g2" style={{ marginTop: 10 }}>
          {PRESETS.map((p) => (
            <div key={p.id} style={{ border: "1px solid #d5d9de", borderRadius: 8, padding: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div aria-hidden style={{ display: "flex", flexDirection: "column", borderRadius: 6, overflow: "hidden", border: "1px solid #d5d9de", flex: "none" }}>
                <span style={{ background: p.look.dark, width: 44, height: 18 }} /><span style={{ background: p.look.light, width: 44, height: 18 }} /><span style={{ background: p.look.accent, width: 44, height: 10 }} />
              </div>
              <div style={{ flex: 1 }}><b>{p.name}</b><div className="adm-hint" style={{ marginTop: 2 }}>{p.blurb}</div>
                <button className="adm-btn" style={{ marginTop: 8 }} disabled={pending} onClick={() => { if (confirm(`Apply the ${p.name} preset? This replaces your colours, font, corners and layout choices.`)) run(() => applyPresetAction(p.id), `Applied ${p.name}.`, () => router.refresh()); }}>Apply {p.name}</button></div>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-card"><h2>Layout</h2>
        <div className="adm-grid adm-g2">
          <Pick label="Header" value={t.header} list={HEADERS} labels={LABELS.header} onChange={(v) => set("header", v)} />
          <Pick label="Product cards" value={t.card} list={CARDS} labels={LABELS.card} onChange={(v) => set("card", v)} />
          <Pick label="Product page" value={t.productPage} list={PRODUCT_PAGES} labels={LABELS.productPage} onChange={(v) => set("productPage", v)} />
          <Pick label="Footer" value={t.footer} list={FOOTERS} labels={LABELS.footer} onChange={(v) => set("footer", v)} />
        </div>
      </section>

      <section className="adm-card"><h2>Home page sections</h2>
        {original
          ? <p className="adm-hint">This store&apos;s home page is hand-designed, so the section list is not used here. It applies to every other store you add.</p>
          : <p className="adm-hint">Tick the sections to show and use the arrows to put them in order.</p>}
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 6, opacity: original ? 0.5 : 1 }}>
          {t.home.map((s, i) => (
            <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #d5d9de", borderRadius: 6, padding: "6px 10px" }}>
              <input type="checkbox" id={`sec-${s.id}`} checked={s.on} onChange={(e) => toggle(i, e.target.checked)} style={{ width: 16, height: 16 }} />
              <label htmlFor={`sec-${s.id}`} style={{ flex: 1 }}>{SECTION_LABEL[s.id]}</label>
              <button className="adm-btn" aria-label={`Move ${SECTION_LABEL[s.id]} up`} disabled={i === 0} onClick={() => move(i, -1)}>&uarr;</button>
              <button className="adm-btn" aria-label={`Move ${SECTION_LABEL[s.id]} down`} disabled={i === t.home.length - 1} onClick={() => move(i, 1)}>&darr;</button>
            </li>
          ))}
        </ul>
        <div className="adm-grid adm-g2" style={{ marginTop: 12 }}>
          <Field label="Brand story: heading"><input className="adm-in" value={t.storyTitle} maxLength={80} onChange={(e) => set("storyTitle", e.target.value)} /></Field>
          <Field label="Brand story: text" hint="Shown by the Brand story section. Leave empty to hide it."><textarea className="adm-in" rows={4} value={t.storyText} maxLength={1500} onChange={(e) => set("storyText", e.target.value)} /></Field>
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="adm-btn adm-pri" disabled={pending} onClick={() => run(() => saveThemeAction(t), "Saved. The shop now uses this layout.")}>{pending ? "Saving..." : "Save layout"}</button>
        {toast}
      </div>
    </>
  );
}
