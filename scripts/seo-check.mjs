// Checks what search engines read, on every kind of page: title, description, one h1, canonical, hreflang, image alt text and valid structured data (JSON-LD).
// Run against a started demo server:  node scripts/seo-check.mjs 3500
const port = process.argv[2] ?? "3500", base = `http://127.0.0.1:${port}`;
let failed = 0, checked = 0;
const bad = (path, m) => { failed++; console.log(`FAIL ${path}: ${m}`); };

const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const kinds = (p) => p === "/" ? "home" : p.startsWith("/products/") ? "product" : p.startsWith("/franchises/") ? "franchise" : p.startsWith("/categories/") ? "category" : "other";
const picked = []; const perKind = {};
for (const u of urls) { const k = kinds(u); perKind[k] = (perKind[k] ?? 0) + 1; if (perKind[k] <= (k === "product" ? 6 : 3)) picked.push(u); }

const types = (ld) => (Array.isArray(ld["@type"]) ? ld["@type"] : [ld["@type"]]);
function flatten(j) { return Array.isArray(j) ? j.flatMap(flatten) : j && j["@graph"] ? j["@graph"].flatMap(flatten) : j ? [j] : []; }

for (const path of picked) {
  const res = await fetch(base + path); const html = await res.text(); checked++;
  if (res.status !== 200) { bad(path, `status ${res.status}`); continue; }
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/) ?? [])[1]?.trim() ?? "";
  if (title.length < 10 || title.length > 75) bad(path, `title is ${title.length} characters ("${title.slice(0, 40)}"): aim for 10 to 75`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? "";
  if (desc.length < 50 || desc.length > 170) bad(path, `meta description is ${desc.length} characters: aim for 50 to 170`);
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length; if (h1 !== 1) bad(path, `${h1} h1 headings (needs exactly 1)`);
  if (!/<link rel="canonical" href="https?:\/\/[^"]+"/.test(html)) bad(path, "no absolute canonical link");
  if (!/<link rel="alternate" hrefLang="x-default"/i.test(html)) bad(path, "no x-default hreflang");
  const noAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/g) ?? []).length; if (noAlt) bad(path, `${noAlt} images with no alt attribute`);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const nodes = [];
  for (const b of blocks) { try { nodes.push(...flatten(JSON.parse(b))); } catch { bad(path, "a JSON-LD block is not valid JSON"); } }
  for (const n of nodes) if (!n["@type"]) bad(path, "a JSON-LD node has no @type");
  const k = kinds(path);
  const of = (t) => nodes.filter((n) => types(n).includes(t));
  if (k === "product") {
    const p = of("Product")[0];
    if (!p) bad(path, "no Product structured data");
    else {
      for (const f of ["name", "image", "description"]) if (!p[f] || (Array.isArray(p[f]) && !p[f].length)) bad(path, `Product is missing ${f}`);
      const offers = [].concat(p.offers ?? []).flatMap((o) => (o["@type"] === "AggregateOffer" ? [o] : [o]));
      if (!offers.length) bad(path, "Product has no offers");
      for (const o of offers) {
        if (!(Number(o.price ?? o.lowPrice) >= 0) || (o.price ?? o.lowPrice) === undefined) bad(path, "offer has no price");
        if (!/^[A-Z]{3}$/.test(o.priceCurrency ?? "")) bad(path, "offer has no 3-letter priceCurrency");
        if (o["@type"] !== "AggregateOffer" && !/schema\.org\/(InStock|OutOfStock|PreOrder|LimitedAvailability|BackOrder|SoldOut|Discontinued)/.test(o.availability ?? "")) bad(path, "offer has no valid availability");
      }
    }
  }
  if (k !== "home") {
    const bc = of("BreadcrumbList")[0];
    if (!bc) bad(path, "no BreadcrumbList");
    else (bc.itemListElement ?? []).forEach((it, i) => { if (it.position !== i + 1 || !it.name) bad(path, `breadcrumb item ${i + 1} has a wrong position or no name`); });
  }
  if (k === "home" && !of("Organization").length && !of("WebSite").length) bad(path, "home page has no Organization or WebSite data");
}
console.log(`${checked} pages checked${failed ? `, ${failed} problems` : ", all clear"}`);
process.exit(failed ? 1 : 0);
