"use client";
/* eslint-disable @next/next/no-img-element -- these show images at addresses the store owner or a customer supplied, which next/image cannot optimise */
import { useState } from "react";
import { saveStoreAction } from "../../store-actions";
import { MediaPicker } from "../../MediaPicker";
import { Field, useAction } from "../../ui";
import { FONT_PRESETS, readableOn, storeCssVars, type FontPreset, type StoreSettings } from "@/lib/store-config";
import type { MediaItem } from "@/lib/admin/repo";

function Colour({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} picker`} style={{ width: 44, height: 36, padding: 2, border: "1px solid #d5d9de", borderRadius: 6 }} />
        <input className="adm-in" value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} style={{ fontFamily: "monospace" }} />
      </div>
    </Field>
  );
}

export function StoreForm({ initial, defaults, media }: { initial: StoreSettings; defaults: StoreSettings; media: MediaItem[] }) {
  const [s, setS] = useState(initial);
  const [lib, setLib] = useState(media);
  const [picker, setPicker] = useState(false);
  const { pending, run, toast } = useAction();
  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const vars = storeCssVars(s);
  const f = FONT_PRESETS[s.font];
  const btn = { background: s.accent, color: readableOn(s.accent), borderRadius: s.radius, textTransform: s.uppercaseButtons ? ("uppercase" as const) : ("none" as const), padding: "10px 18px", fontWeight: 600, border: 0, fontFamily: f.body };

  return (
    <>
      <div className="adm-h"><div><h1>Brand and design</h1><p>The look of this store: name, logo, colours, type and buttons. Changes apply across the whole shop when you save, no code needed.</p></div></div>

      <section className="adm-card"><h2>Preview</h2>
        <div style={{ ...vars, border: "1px solid #d5d9de", borderRadius: 8, overflow: "hidden", fontFamily: f.body }}>
          <div style={{ background: s.accent, color: readableOn(s.accent), textAlign: "center", padding: "6px 10px", fontSize: 13, fontWeight: 600 }}>{s.announcements[0]?.text || "Announcement"}</div>
          <div style={{ background: s.dark, padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <img src={s.logoUrl} alt="" style={{ height: 30, width: "auto", maxWidth: "70%" }} />
            {s.logoLabel ? <span style={{ color: s.accent, fontFamily: "Georgia, serif", letterSpacing: "0.5em", fontSize: 11, fontWeight: 700 }}>{s.logoLabel}</span> : null}
          </div>
          <div style={{ background: s.light, color: s.text, padding: "26px 20px" }}>
            <div style={{ fontFamily: f.display, fontWeight: f.weight, letterSpacing: f.tracking, fontSize: 30, lineHeight: 1.05 }}>{s.tagline || "Your tagline appears here"}</div>
            <p style={{ maxWidth: 520, marginTop: 10, opacity: 0.75 }}>{s.description}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}><button style={btn}>Shop new arrivals</button><button style={{ ...btn, background: "transparent", color: s.text, border: `1px solid ${s.text}55` }}>Browse everything</button></div>
          </div>
          <div style={{ background: s.dark, color: "#f5f5f5", padding: "12px 20px", fontSize: 13 }}>Footer · <span style={{ color: s.accent }}>link colour</span></div>
        </div>
      </section>

      <section className="adm-card"><h2>Brand</h2>
        <div className="adm-grid adm-g2">
          <Field label="Store name" hint="Browser tab, search results and social sharing."><input className="adm-in" value={s.name} onChange={(e) => set("name", e.target.value)} maxLength={60} /></Field>
          <Field label="Legal / brand name" hint="Used in structured data and as the logo's text alternative."><input className="adm-in" value={s.legalName} onChange={(e) => set("legalName", e.target.value)} maxLength={80} /></Field>
        </div>
        <div className="adm-grid" style={{ marginTop: 12 }}>
          <Field label="Home page heading"><input className="adm-in" value={s.heroHeading} onChange={(e) => set("heroHeading", e.target.value)} maxLength={120} /></Field>
          <Field label="Tagline"><input className="adm-in" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} /></Field>
          <Field label="Description" hint="Footer blurb and the default search-result description."><textarea className="adm-ta" style={{ minHeight: 70 }} value={s.description} onChange={(e) => set("description", e.target.value)} maxLength={320} /></Field>
        </div>
      </section>

      <section className="adm-card"><h2>Logo</h2>
        <div style={{ background: s.dark, padding: 16, borderRadius: 8, display: "inline-block", marginBottom: 12 }}><img src={s.logoUrl} alt="Logo preview" style={{ height: 40, width: "auto", display: "block" }} /></div>
        <p className="adm-hint">Use a logo made for dark backgrounds (white or light artwork on transparent). It sits on the Dark colour below.</p>
        <div className="adm-grid adm-g3">
          <Field label="Logo image"><div style={{ display: "flex", gap: 8 }}><input className="adm-in" value={s.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} /><button type="button" className="adm-btn" onClick={() => setPicker(true)}>Choose</button></div></Field>
          <Field label="Width x height (px)"><div style={{ display: "flex", gap: 8 }}><input className="adm-in" type="number" value={s.logoWidth} onChange={(e) => set("logoWidth", Number(e.target.value))} /><input className="adm-in" type="number" value={s.logoHeight} onChange={(e) => set("logoHeight", Number(e.target.value))} /></div></Field>
          <Field label="Word under the logo" hint="Leave empty for none."><input className="adm-in" value={s.logoLabel} onChange={(e) => set("logoLabel", e.target.value)} maxLength={14} /></Field>
        </div>
      </section>

      <section className="adm-card"><h2>Colours</h2>
        <div className="adm-grid adm-g4">
          <Colour label="Accent" value={s.accent} onChange={(v) => set("accent", v)} hint="Buttons and highlights." />
          <Colour label="Dark" value={s.dark} onChange={(v) => set("dark", v)} hint="Header, footer, dark sections." />
          <Colour label="Page background" value={s.light} onChange={(v) => set("light", v)} />
          <Colour label="Text" value={s.text} onChange={(v) => set("text", v)} hint="On light areas." />
        </div>
        <p className="adm-hint" style={{ marginTop: 10 }}>Text on buttons switches between black and white automatically so it stays readable.</p>
      </section>

      <section className="adm-card"><h2>Type and buttons</h2>
        <div className="adm-grid adm-g3">
          <Field label="Font style"><select className="adm-in" value={s.font} onChange={(e) => set("font", e.target.value as FontPreset)}>{Object.entries(FONT_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label={`Corner roundness (${s.radius}px)`}><input type="range" min={0} max={32} value={s.radius} onChange={(e) => set("radius", Number(e.target.value))} style={{ width: "100%" }} /></Field>
          <Field label="Button text"><label style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 8 }}><input type="checkbox" checked={s.uppercaseButtons} onChange={(e) => set("uppercaseButtons", e.target.checked)} /> UPPERCASE</label></Field>
        </div>
      </section>

      <section className="adm-card"><h2>Announcement bar</h2>
        <p className="adm-hint">Rotating messages above the header. Only advertise offers that really exist. Leave empty to hide the bar.</p>
        {s.announcements.map((a, i) => (
          <div key={i} className="adm-grid" style={{ gridTemplateColumns: "2fr 1fr auto", gap: 8, marginTop: 8 }}>
            <input className="adm-in" value={a.text} placeholder="Message" onChange={(e) => set("announcements", s.announcements.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            <input className="adm-in" value={a.href} placeholder="/new (optional link)" onChange={(e) => set("announcements", s.announcements.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
            <button type="button" className="adm-btn" onClick={() => set("announcements", s.announcements.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        {s.announcements.length < 6 ? <button type="button" className="adm-btn" style={{ marginTop: 10 }} onClick={() => set("announcements", [...s.announcements, { text: "", href: "" }])}>Add a message</button> : null}
      </section>

      <div className="adm-sticky">
        <button className="adm-btn adm-pri" disabled={pending} onClick={() => run(() => saveStoreAction(s), "Saved. The shop now uses this look.")}>{pending ? "Saving..." : "Save brand and design"}</button>
        <button className="adm-btn" disabled={pending} onClick={() => { if (confirm("Put every brand and design setting back to the original Sparkthunder look? Nothing is saved until you press Save.")) setS(defaults); }}>Reset to Sparkthunder defaults</button>
        {toast}
      </div>

      {picker ? <MediaPicker media={lib} onClose={() => setPicker(false)} onPick={(m) => {
        setLib((l) => (l.some((x) => x.id === m.id) ? l : [m, ...l]));
        setS((x) => ({ ...x, logoUrl: m.url, ...(m.width && m.height ? { logoWidth: m.width, logoHeight: m.height } : {}) }));
        setPicker(false);
      }} /> : null}
    </>
  );
}
