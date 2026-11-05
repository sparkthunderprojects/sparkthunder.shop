"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteTaxonomyAction, saveCategoryAction, saveFranchiseAction } from "./actions";
import { DescCounter, ScoreList, SerpPreview, SocialPreview, TitleCounter } from "./SeoWidgets";
import { Field, Toggle, useAction } from "./ui";
import { categorySeo, franchiseSeo } from "@/lib/seo/effective";
import { categoryInput, franchiseInput, scoreSeo } from "@/lib/seo/score";
import { slugify } from "@/lib/seo/text";
import type { Category, Franchise } from "@/lib/types";

type Item = Franchise | Category;

export function TaxonomyEditor({ kind, initial, isNew, productCount }: { kind: "franchises" | "categories"; initial: Item; isNew: boolean; productCount: number }) {
  const router = useRouter();
  const isFr = kind === "franchises";
  const [v, setV] = useState<Item>(initial);
  const [touched, setTouched] = useState(!isNew);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { pending, run, toast } = useAction();
  const set = <K extends keyof Franchise>(k: K, val: Franchise[K]) => setV((x) => ({ ...x, [k]: val }));
  const eff = useMemo(() => (isFr ? franchiseSeo(v as Franchise) : categorySeo(v as Category)), [v, isFr]);
  const result = useMemo(() => scoreSeo(isFr ? franchiseInput(v as Franchise) : categoryInput(v as Category)), [v, isFr]);
  const base = `/admin/${kind}`;
  const err = (k: string) => (errs[k] ? <span className="adm-toast err">{errs[k]}</span> : null);

  function save() {
    run(() => (isFr ? saveFranchiseAction(v as Franchise, isNew ? null : initial.slug) : saveCategoryAction(v as Category, isNew ? null : initial.slug)).then((r) => { setErrs(r.ok ? {} : r.fields ?? {}); return r; }),
      "Saved", (r) => { if (isNew || r.slug !== initial.slug) router.replace(`${base}/${r.slug}`); else router.refresh(); });
  }
  function remove() {
    if (!confirm(`Delete "${v.name}"?`)) return;
    run(() => deleteTaxonomyAction(kind, initial.slug), "Deleted", () => router.push(base));
  }
  const label = isFr ? "franchise" : "category";
  return (
    <>
      <div className="adm-h"><div><h1>{isNew ? `New ${label}` : v.name || `Edit ${label}`}</h1><p><Link href={base}>All {kind}</Link>{!isNew ? <> · <a href={`/${kind}/${initial.slug}`} target="_blank" rel="noreferrer">View live page</a></> : null}</p></div></div>
      <section className="adm-card"><h2>General</h2>
        <div className="adm-grid">
          <div className="adm-grid adm-g2">
            <Field label="Name"><input className="adm-in" value={v.name} onChange={(e) => { const name = e.target.value; setV((x) => ({ ...x, name, slug: touched ? x.slug : slugify(name) })); }} />{err("name")}</Field>
            <Field label="URL slug" hint={`/${kind}/${v.slug || "..."}${!isNew && v.slug !== initial.slug ? " (a 301 redirect is created automatically)" : ""}`}><input className="adm-in" value={v.slug} onChange={(e) => { setTouched(true); set("slug", slugify(e.target.value)); }} />{err("slug")}</Field>
          </div>
          {isFr ? <>
            <Field label="Tagline"><input className="adm-in" value={(v as Franchise).tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
            <Field label="Accent colour"><div style={{ display: "flex", gap: 8 }}><input type="color" value={(v as Franchise).accent} onChange={(e) => set("accent", e.target.value)} style={{ width: 48, height: 38 }} aria-label="Accent colour" /><input className="adm-in" value={(v as Franchise).accent} onChange={(e) => set("accent", e.target.value)} /></div></Field>
            <Field label="Universe website" hint="The universe's own site. Used for the link-out on the shop and for the embeddable product widget."><input className="adm-in" placeholder="https://knightverge.com" value={(v as Franchise).siteUrl ?? ""} onChange={(e) => set("siteUrl", e.target.value)} />{err("siteUrl")}</Field>
          </> : null}
          <Field label={isFr ? "Description (franchise page copy)" : "Intro copy"} hint="Unique copy of 200+ words helps this page rank. Separate paragraphs with a blank line."><textarea className="adm-ta" style={{ minHeight: 200 }} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Sort order" hint="Lower numbers appear first."><input className="adm-in" type="number" style={{ maxWidth: 140 }} value={v.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} /></Field>
        </div>
      </section>
      <section className="adm-card"><h2>Search engine listing</h2>
        <div className="adm-grid" style={{ marginBottom: 16 }}>
          <Field label="Focus keyword"><input className="adm-in" value={v.focusKeyword ?? ""} onChange={(e) => set("focusKeyword", e.target.value)} /></Field>
          <Field label="SEO title" hint={`Leave empty to use: ${eff.title}`}><input className="adm-in" placeholder={eff.title} value={v.seoTitle ?? ""} onChange={(e) => set("seoTitle", e.target.value)} /><TitleCounter value={eff.title} /></Field>
          <Field label="Meta description"><textarea className="adm-ta" style={{ minHeight: 70 }} placeholder={eff.description} value={v.seoDescription ?? ""} onChange={(e) => set("seoDescription", e.target.value)} /><DescCounter value={eff.description} /></Field>
          <Field label="Social image URL"><input className="adm-in" value={v.ogImage ?? ""} onChange={(e) => set("ogImage", e.target.value)} /></Field>
          <Toggle label="Hide from search engines (noindex)" checked={Boolean(v.noindex)} onChange={(x) => set("noindex", x)} />
        </div>
        <div className="adm-grid adm-g2">
          <div><div className="adm-lbl">Google preview</div><SerpPreview title={eff.title} description={eff.description} path={eff.path} />
            <div className="adm-lbl" style={{ marginTop: 18 }}>Social preview</div><SocialPreview title={eff.title} description={eff.description} image={eff.image} /></div>
          <div><div className="adm-lbl">SEO score</div><ScoreList result={result} /></div>
        </div>
      </section>
      {!isNew ? <section className="adm-card"><h2>Danger zone</h2>
        {productCount > 0 ? <p className="adm-hint">{productCount} product{productCount === 1 ? " uses" : "s use"} this {label}. Move them before deleting.</p> : <button className="adm-btn adm-danger" onClick={remove}>Delete {label}</button>}</section> : null}
      <div className="adm-sticky"><button className="adm-btn adm-pri" disabled={pending} onClick={save}>{pending ? "Saving..." : "Save"}</button>{toast}</div>
    </>
  );
}
