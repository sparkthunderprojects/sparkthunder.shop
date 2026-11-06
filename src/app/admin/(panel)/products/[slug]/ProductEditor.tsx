"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteProductAction, saveProductAction } from "../../../actions";
import { MediaPicker } from "../../../MediaPicker";
import { DescCounter, ScoreList, SerpPreview, SocialPreview, TitleCounter } from "../../../SeoWidgets";
import { Field, penceToPounds, poundsToPence, Toggle, useAction } from "../../../ui";
import type { MediaItem } from "@/lib/admin/repo";
import { productSeo } from "@/lib/seo/effective";
import { productInput, scoreSeo } from "@/lib/seo/score";
import { slugify } from "@/lib/seo/text";
import type { Category, Franchise, Product, Variant } from "@/lib/types";

export function ProductEditor({ initial, isNew, franchises, categories, media, bundleChoices }: { initial: Product; isNew: boolean; franchises: Franchise[]; categories: Category[]; media: MediaItem[]; bundleChoices: { slug: string; name: string; pricePence: number }[] }) {
  const router = useRouter();
  const [p, setP] = useState<Product>(initial);
  const [price, setPrice] = useState(penceToPounds(initial.pricePence));
  const [compare, setCompare] = useState(penceToPounds(initial.comparePricePence));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [picker, setPicker] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [lib, setLib] = useState(media);
  const { pending, run, toast } = useAction();
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));

  const franchise = franchises.find((f) => f.slug === p.franchiseSlug);
  const live = useMemo(() => ({ ...p, pricePence: poundsToPence(price) }), [p, price]);
  const eff = useMemo(() => productSeo(live, franchise), [live, franchise]);
  const result = useMemo(() => scoreSeo(productInput(live, franchise)), [live, franchise]);
  const originalSlug = isNew ? null : initial.slug;
  const slugChanged = !isNew && p.slug !== initial.slug;
  const variants = p.variants ?? [];
  const bundle = p.bundleItems ?? [];
  const bundleTotal = bundle.reduce((n, b) => n + (bundleChoices.find((c) => c.slug === b.slug)?.pricePence ?? 0) * (Number(b.qty) || 0), 0);
  const setBundle = (i: number, v: Partial<{ slug: string; qty: number }>) => set("bundleItems", bundle.map((x, n) => (n === i ? { ...x, ...v } : x)));
  const setVariant = (i: number, v: Partial<Variant>) => set("variants", variants.map((x, n) => (n === i ? { ...x, ...v } : x)));
  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= p.images.length) return;
    const imgs = [...p.images], alts = [...(p.imageAlts ?? [])];
    while (alts.length < imgs.length) alts.push("");
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]]; [alts[i], alts[j]] = [alts[j], alts[i]];
    setP((x) => ({ ...x, images: imgs, imageAlts: alts }));
  };
  const removeImage = (i: number) => setP((x) => ({ ...x, images: x.images.filter((_, n) => n !== i), imageAlts: (x.imageAlts ?? []).filter((_, n) => n !== i) }));
  const setAlt = (i: number, v: string) => setP((x) => { const a = [...(x.imageAlts ?? [])]; while (a.length < x.images.length) a.push(""); a[i] = v; return { ...x, imageAlts: a }; });

  function save(publish?: boolean) {
    const next: Product = { ...p, pricePence: poundsToPence(price), comparePricePence: compare.trim() ? poundsToPence(compare) : undefined, ...(publish === undefined ? {} : { published: publish }) };
    if (!next.comparePricePence) delete next.comparePricePence;
    run(() => saveProductAction(next, originalSlug).then((r) => { setErrs(r.ok ? {} : r.fields ?? {}); return r; }), publish ? "Published" : "Saved", (r) => {
      if (isNew || r.slug !== initial.slug) router.replace(`/admin/products/${r.slug}`); else router.refresh();
      if (publish !== undefined) set("published", publish);
    });
  }
  function remove() {
    if (!confirm(`Delete "${p.name}"? Its URL will 301 redirect to the ${p.categorySlug} category.`)) return;
    run(() => deleteProductAction(initial.slug, null), "Deleted", () => router.push("/admin/products"));
  }
  const err = (k: string) => (errs[k] ? <span className="adm-toast err">{errs[k]}</span> : null);

  return (
    <>
      <div className="adm-h">
        <div><h1>{isNew ? "New product" : p.name || "Edit product"}</h1>
          <p><Link href="/admin/products">All products</Link>{!isNew && p.published !== false ? <> · <a href={`/products/${initial.slug}`} target="_blank" rel="noreferrer">View live page</a></> : null}</p></div>
        <span className={`adm-badge ${p.published !== false ? "adm-ok" : ""}`}>{p.published !== false ? "Published" : "Draft"}</span>
      </div>

      <section className="adm-card"><h2>General</h2>
        <div className="adm-grid">
          <Field label="Product name"><input className="adm-in" value={p.name} onChange={(e) => { const name = e.target.value; setP((x) => ({ ...x, name, slug: slugTouched ? x.slug : slugify(name) })); }} />{err("name")}</Field>
          <div className="adm-grid adm-g2">
            <Field label="URL slug" hint={<>/products/{p.slug || "..."}{slugChanged ? <b style={{ color: "#b7791f" }}> A 301 redirect from the old URL will be created automatically.</b> : null}</>}>
              <input className="adm-in" value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />{err("slug")}</Field>
            <Field label="SKU"><input className="adm-in" value={p.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />{err("sku")}</Field>
          </div>
          <div className="adm-grid adm-g2">
            <Field label="Franchise"><select className="adm-sel" value={p.franchiseSlug} onChange={(e) => set("franchiseSlug", e.target.value)}>{franchises.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}</select></Field>
            <Field label="Category"><select className="adm-sel" value={p.categorySlug} onChange={(e) => set("categorySlug", e.target.value)}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
          </div>
          <Field label="Short description" hint="One or two sentences. Shown on cards and used as the fallback meta description."><textarea className="adm-ta" style={{ minHeight: 64 }} value={p.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></Field>
          <Field label="Full description" hint="Unique copy ranks. Aim for 120+ words describing the design, fit, material and who it is for."><textarea className="adm-ta" style={{ minHeight: 180 }} value={p.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Details (one per line)"><textarea className="adm-ta" value={p.details.join("\n")} onChange={(e) => set("details", e.target.value.split("\n"))} /></Field>
          <Field label="Tags (comma separated)"><input className="adm-in" value={(p.tags ?? []).join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()))} /></Field>
        </div>
      </section>

      <section className="adm-card"><h2>Images</h2>
        <div className="adm-grid">
          {p.images.map((src, i) => (
            <div key={src + i} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 12, alignItems: "start" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="adm-thumb" style={{ width: 72, height: 72 }} src={src} alt="" />
              <Field label={i === 0 ? "Alt text (main image)" : `Alt text (image ${i + 1})`}><input className="adm-in" placeholder="Describe the image for search and screen readers" value={p.imageAlts?.[i] ?? ""} onChange={(e) => setAlt(i, e.target.value)} /></Field>
              <span style={{ display: "flex", gap: 4, paddingTop: 20 }}>
                <button type="button" className="adm-btn" aria-label="Move earlier" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className="adm-btn" aria-label="Move later" onClick={() => move(i, 1)} disabled={i === p.images.length - 1}>↓</button>
                <button type="button" className="adm-btn adm-danger" aria-label="Remove image" onClick={() => removeImage(i)}>×</button>
              </span>
            </div>
          ))}
          <div><button type="button" className="adm-btn" onClick={() => setPicker(true)}>Add images from library</button>
            {p.images.length === 0 ? <span className="adm-hint"> Until you add a photo the storefront shows generated placeholder art.</span> : null}</div>
        </div>
      </section>

      <section className="adm-card"><h2>Pricing and stock</h2>
        <div className="adm-grid adm-g3">
          <Field label="Price (£)"><input className="adm-in" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />{err("price")}</Field>
          <Field label="Compare-at price (£)" hint="Optional. Shows a sale."><input className="adm-in" inputMode="decimal" value={compare} onChange={(e) => setCompare(e.target.value)} />{err("compare")}</Field>
          <div />
        </div>
        <div className="adm-grid" style={{ marginTop: 14 }}>
          <Toggle label="Track stock quantity" hint="When on, the product becomes sold out automatically at zero." checked={Boolean(p.trackStock)} onChange={(v) => set("trackStock", v)} />
          {p.trackStock ? (
            <div className="adm-grid adm-g3">
              <Field label="Quantity in stock"><input className="adm-in" type="number" min={0} value={p.stockQty ?? 0} onChange={(e) => set("stockQty", Math.max(0, Number(e.target.value) || 0))} /></Field>
              <Field label="Low stock alert at"><input className="adm-in" type="number" min={0} value={p.lowStockThreshold ?? 3} onChange={(e) => set("lowStockThreshold", Math.max(0, Number(e.target.value) || 0))} /></Field>
            </div>
          ) : <Toggle label="In stock" checked={p.inStock} onChange={(v) => set("inStock", v)} />}
        </div>
      </section>

      <section className="adm-card"><h2>Variants</h2>
        <p className="adm-hint" style={{ marginTop: -8, marginBottom: 12 }}>Sizes, colours or editions, each with its own SKU, stock and optional price. Name them like <b>Black / L</b> (colour / size) to get separate Colour and Size pickers on the site, or just <b>S</b>, <b>M</b>, <b>L</b> for one Size picker. With stock tracking on, set stock per variant: the product total is worked out for you.</p>
        {variants.map((v, i) => (
          <div key={i} className="adm-grid" style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr auto", marginBottom: 8, alignItems: "end" }}>
            <Field label="Name"><input className="adm-in" value={v.name} placeholder="e.g. Large" onChange={(e) => setVariant(i, { name: e.target.value })} /></Field>
            <Field label="SKU"><input className="adm-in" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} /></Field>
            <Field label="Stock"><input className="adm-in" type="number" min={0} value={v.stockQty} onChange={(e) => setVariant(i, { stockQty: Math.max(0, Number(e.target.value) || 0) })} /></Field>
            <Field label="Price (£)"><input className="adm-in" inputMode="decimal" placeholder="same" value={penceToPounds(v.pricePence)} onChange={(e) => setVariant(i, { pricePence: e.target.value ? poundsToPence(e.target.value) : undefined })} /></Field>
            <button type="button" className="adm-btn adm-danger" aria-label="Remove variant" onClick={() => set("variants", variants.filter((_, n) => n !== i))}>×</button>
          </div>
        ))}
        {err("variants")}
        <button type="button" className="adm-btn" onClick={() => set("variants", [...variants, { name: "", sku: p.sku ? `${p.sku}-${variants.length + 1}` : "", stockQty: 0 }])}>Add variant</button>
      </section>

      <section className="adm-card"><h2>Bundle contents</h2>
        <p className="adm-hint" style={{ marginTop: -8, marginBottom: 12 }}>Make this a bundle: a product made of other products, sold at its own price (set the price above). It sells out when any product inside does, and buying it takes stock off each one. Leave empty for a normal product. Products with size or colour options cannot go in a bundle.</p>
        {bundle.map((b, i) => (
          <div key={i} className="adm-grid" style={{ gridTemplateColumns: "4fr 1fr auto", marginBottom: 8, alignItems: "end" }}>
            <Field label="Product"><select className="adm-sel" value={b.slug} onChange={(e) => setBundle(i, { slug: e.target.value })}><option value="">Choose a product</option>{bundleChoices.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
            <Field label="Quantity"><input className="adm-in" type="number" min={1} max={10} value={b.qty} onChange={(e) => setBundle(i, { qty: Math.max(1, Number(e.target.value) || 1) })} /></Field>
            <button type="button" className="adm-btn adm-danger" aria-label="Remove from bundle" onClick={() => set("bundleItems", bundle.filter((_, n) => n !== i))}>×</button>
          </div>
        ))}
        {err("bundle")}
        {bundle.length > 1 && bundleTotal > 0 ? <p className="adm-hint">Bought separately these cost <b>£{(bundleTotal / 100).toFixed(2)}</b>. {poundsToPence(price) < bundleTotal ? <>Your bundle price saves customers <b>£{((bundleTotal - poundsToPence(price)) / 100).toFixed(2)}</b>.</> : <>Your bundle price is not lower than buying separately.</>}</p> : null}
        <button type="button" className="adm-btn" onClick={() => set("bundleItems", [...bundle, { slug: "", qty: 1 }])}>Add a product to the bundle</button>
      </section>

      <section className="adm-card"><h2>Search engine listing</h2>
        <div className="adm-grid" style={{ marginBottom: 16 }}>
          <Field label="Focus keyword" hint="The phrase you want this page to rank for."><input className="adm-in" value={p.focusKeyword ?? ""} onChange={(e) => set("focusKeyword", e.target.value)} /></Field>
          <Field label="SEO title" hint={`Leave empty to use: ${eff.title}`}><input className="adm-in" value={p.seoTitle ?? ""} placeholder={eff.title} onChange={(e) => set("seoTitle", e.target.value)} /><TitleCounter value={eff.title} />{err("seoTitle")}</Field>
          <Field label="Meta description" hint="Leave empty to generate from the descriptions."><textarea className="adm-ta" style={{ minHeight: 70 }} value={p.seoDescription ?? ""} placeholder={eff.description} onChange={(e) => set("seoDescription", e.target.value)} /><DescCounter value={eff.description} />{err("seoDescription")}</Field>
          <div className="adm-grid adm-g2">
            <Field label="Canonical URL" hint="Only set this if another URL is the primary version."><input className="adm-in" placeholder={eff.canonical} value={p.canonicalUrl ?? ""} onChange={(e) => set("canonicalUrl", e.target.value)} />{err("canonical")}</Field>
            <Field label="Social image URL" hint="Defaults to the first product image."><input className="adm-in" value={p.ogImage ?? ""} placeholder={eff.image ?? ""} onChange={(e) => set("ogImage", e.target.value)} /></Field>
          </div>
          <Toggle label="Hide from search engines (noindex)" hint="The page stays live but is left out of Google and the sitemap." checked={Boolean(p.noindex)} onChange={(v) => set("noindex", v)} />
        </div>
        <div className="adm-grid adm-g2">
          <div><div className="adm-lbl">Google preview</div><SerpPreview title={eff.title} description={eff.description} path={eff.path} />
            <div className="adm-lbl" style={{ marginTop: 18 }}>Social preview</div><SocialPreview title={eff.title} description={eff.description} image={eff.image} /></div>
          <div><div className="adm-lbl">SEO score</div><ScoreList result={result} /></div>
        </div>
      </section>

      <section className="adm-card"><h2>Visibility</h2>
        <div className="adm-grid">
          <Toggle label="Featured" hint="Shown in featured rows on the homepage." checked={p.isFeatured} onChange={(v) => set("isFeatured", v)} />
          <Toggle label="New arrival" checked={p.isNew} onChange={(v) => set("isNew", v)} />
        </div>
      </section>

      {!isNew ? <section className="adm-card"><h2>Danger zone</h2><button type="button" className="adm-btn adm-danger" onClick={remove}>Delete product</button></section> : null}

      <div className="adm-sticky">
        <button type="button" className="adm-btn adm-pri" disabled={pending} onClick={() => save()}>{pending ? "Saving..." : "Save"}</button>
        {p.published === false ? <button type="button" className="adm-btn adm-bolt" disabled={pending} onClick={() => save(true)}>Save and publish</button>
          : <button type="button" className="adm-btn" disabled={pending} onClick={() => save(false)}>Unpublish</button>}
        {toast}
      </div>

      {picker ? <MediaPicker media={lib} onClose={() => setPicker(false)} onPick={(m) => {
        setLib((l) => (l.some((x) => x.id === m.id) ? l : [m, ...l]));
        setP((x) => ({ ...x, images: [...x.images, m.url], imageAlts: [...(x.imageAlts ?? []).slice(0, x.images.length), m.alt] }));
        setPicker(false);
      }} /> : null}
    </>
  );
}
