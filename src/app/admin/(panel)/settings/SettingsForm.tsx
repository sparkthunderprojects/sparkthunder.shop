"use client";
import { useState } from "react";
import { saveSettingsAction } from "../../actions";
import { Field, useAction } from "../../ui";
import type { SiteSettings } from "@/lib/admin/repo";

export function SettingsForm({ initial, indexNow }: { initial: SiteSettings; indexNow: boolean }) {
  const [s, setS] = useState(initial);
  const { pending, run, toast } = useAction();
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  return (
    <>
      <div className="adm-h"><div><h1>Settings</h1><p>Site-wide search and social defaults.</p></div></div>
      <section className="adm-card"><h2>Defaults</h2>
        <div className="adm-grid">
          <Field label="Default meta description" hint="Used for pages that do not set their own."><textarea className="adm-ta" style={{ minHeight: 70 }} value={s.defaultDescription} onChange={(e) => set("defaultDescription", e.target.value)} /></Field>
          <Field label="Default social image URL" hint="1200×630 works best."><input className="adm-in" value={s.defaultOgImage} onChange={(e) => set("defaultOgImage", e.target.value)} /></Field>
          <div className="adm-grid adm-g2">
            <Field label="X / Twitter handle"><input className="adm-in" placeholder="@sparkthunder" value={s.twitterHandle} onChange={(e) => set("twitterHandle", e.target.value)} /></Field>
            <Field label="Contact email"><input className="adm-in" type="email" value={s.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
          </div>
          <Field label="Official profiles (one URL per line)" hint="Added to your Organization structured data as sameAs, which helps Google connect your brand."><textarea className="adm-ta" value={s.sameAs.join("\n")} onChange={(e) => set("sameAs", e.target.value.split("\n"))} /></Field>
        </div>
      </section>
      <section className="adm-card"><h2>Search engine verification</h2>
        <div className="adm-grid adm-g2">
          <Field label="Google Search Console token" hint="The content value from the HTML tag method."><input className="adm-in" value={s.googleVerification} onChange={(e) => set("googleVerification", e.target.value.trim())} /></Field>
          <Field label="Bing Webmaster token"><input className="adm-in" value={s.bingVerification} onChange={(e) => set("bingVerification", e.target.value.trim())} /></Field>
        </div>
      </section>
      <section className="adm-card"><h2>Instant indexing</h2>
        <p>IndexNow tells Bing, Yandex and others about changes the moment you save. Status: <span className={`adm-badge ${indexNow ? "adm-ok" : "adm-warn"}`}>{indexNow ? "Active" : "Not configured"}</span></p>
        {!indexNow ? <p className="adm-hint">Set an <code>INDEXNOW_KEY</code> environment variable (any 16+ character string of letters and numbers) on your host and redeploy.</p> : null}
      </section>
      <div className="adm-sticky"><button className="adm-btn adm-pri" disabled={pending} onClick={() => run(() => saveSettingsAction({ ...s, sameAs: s.sameAs.map((x) => x.trim()).filter(Boolean) }), "Settings saved")}>{pending ? "Saving..." : "Save settings"}</button>{toast}</div>
    </>
  );
}
