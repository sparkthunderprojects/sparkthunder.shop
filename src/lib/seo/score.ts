import { categorySeo, franchiseSeo, productSeo } from "@/lib/seo/effective";
import { descPx, DESC_PX, includesKeyword, titlePx, TITLE_PX, wordCount } from "@/lib/seo/text";
import type { Category, Franchise, Product } from "@/lib/types";

export type Status = "pass" | "warn" | "fail";
export type Check = { id: string; label: string; status: Status; hint: string; weight: number };
export type SeoResult = { score: number; grade: "A" | "B" | "C" | "D"; checks: Check[] };

export type SeoInput = {
  kind: "product" | "franchise" | "category";
  slug: string;
  name: string;
  title: string;
  description: string;
  /** Main on-page copy (product description, or franchise/category intro). */
  body: string;
  keyword: string;
  images: { src: string; alt: string }[];
  noindex: boolean;
  hasPrice?: boolean;
  hasSku?: boolean;
  duplicateTitle?: boolean;
  duplicateDescription?: boolean;
};

const isPlaceholder = (src: string) => !src || src.startsWith("/art/");

export function scoreSeo(i: SeoInput): SeoResult {
  const checks: Check[] = [];
  const add = (id: string, label: string, status: Status, hint: string, weight = 1) => checks.push({ id, label, status, hint, weight });
  const kw = i.keyword.trim();

  const tLen = i.title.trim().length;
  const tPx = titlePx(i.title);
  add("title-length", "Title length", !tLen ? "fail" : tPx > TITLE_PX ? "fail" : tLen < 30 ? "warn" : "pass",
    !tLen ? "Add a page title." : tPx > TITLE_PX ? `Too long: about ${tPx}px, Google cuts titles off near ${TITLE_PX}px. Shorten it.` : tLen < 30 ? "A little short. 30-60 characters uses the space well." : `Good (${tLen} characters, about ${tPx}px).`, 2);

  const dLen = i.description.trim().length;
  const dPx = descPx(i.description);
  add("desc-length", "Meta description length", !dLen ? "fail" : dPx > DESC_PX ? "warn" : dLen < 70 ? "warn" : "pass",
    !dLen ? "Add a meta description." : dPx > DESC_PX ? `Long: about ${dPx}px, it will be truncated in results (limit about ${DESC_PX}px).` : dLen < 70 ? "A little short. Aim for 70-160 characters." : `Good (${dLen} characters).`, 2);

  if (i.duplicateTitle !== undefined) add("title-unique", "Unique title", i.duplicateTitle ? "fail" : "pass", i.duplicateTitle ? "Another page uses the same title. Make each title unique." : "No other page shares this title.");
  if (i.duplicateDescription !== undefined) add("desc-unique", "Unique description", i.duplicateDescription ? "fail" : "pass", i.duplicateDescription ? "Another page uses the same meta description." : "No other page shares this description.");

  add("keyword-set", "Focus keyword", kw ? "pass" : "warn", kw ? `Targeting "${kw}".` : "Choose the phrase people would search for to find this page.", 1);
  if (kw) {
    add("keyword-title", "Keyword in title", includesKeyword(i.title, kw) ? "pass" : "fail", includesKeyword(i.title, kw) ? "Found in the title." : "Put the focus keyword in the title, ideally near the start.", 2);
    add("keyword-desc", "Keyword in meta description", includesKeyword(i.description, kw) ? "pass" : "warn", includesKeyword(i.description, kw) ? "Found in the description." : "Mention the focus keyword in the meta description.");
    add("keyword-slug", "Keyword in URL", includesKeyword(i.slug.replace(/-/g, " "), kw) ? "pass" : "warn", includesKeyword(i.slug.replace(/-/g, " "), kw) ? "Found in the URL." : "Consider including the keyword in the URL (a redirect is created automatically if you change it).");
    const intro = i.body.split(/\s+/).slice(0, 120).join(" ");
    add("keyword-body", "Keyword in opening copy", includesKeyword(intro, kw) ? "pass" : "warn", includesKeyword(intro, kw) ? "Found early in the copy." : "Use the focus keyword in the first paragraph.");
  }

  const words = wordCount(i.body);
  const [good, ok] = i.kind === "product" ? [120, 50] : [300, 150];
  add("content-length", "Content depth", words >= good ? "pass" : words >= ok ? "warn" : "fail",
    words >= good ? `${words} words, plenty for search engines to understand the page.` : `${words} words. Aim for ${good}+ of unique copy.`, 2);

  const real = i.images.filter((m) => !isPlaceholder(m.src));
  if (i.kind === "product") {
    add("image-present", "Product photography", real.length ? "pass" : "fail", real.length ? `${real.length} image${real.length === 1 ? "" : "s"}.` : "Upload at least one real photo. Generated placeholder art does not win image search or rich results.", 2);
    const missing = real.filter((m) => m.alt.trim().length < 5).length;
    add("image-alt", "Image alt text", real.length === 0 ? "warn" : missing === 0 ? "pass" : "fail", real.length === 0 ? "Add images first." : missing === 0 ? "Every image has descriptive alt text." : `${missing} image${missing === 1 ? " is" : "s are"} missing alt text.`, 2);
    if (kw && real.length) add("keyword-alt", "Keyword in an image alt", real.some((m) => includesKeyword(m.alt, kw)) ? "pass" : "warn", real.some((m) => includesKeyword(m.alt, kw)) ? "Found in image alt text." : "Use the keyword naturally in one image's alt text.");
    add("rich-data", "Product structured data", i.hasPrice && i.hasSku ? "pass" : "fail", i.hasPrice && i.hasSku ? "Price, SKU and availability are present for Google product rich results." : "Price and SKU are required for rich results.", 2);
  }
  add("indexable", "Indexable", i.noindex ? "warn" : "pass", i.noindex ? "This page is set to noindex and will not appear in search." : "Search engines may index this page.");

  const total = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  const score = Math.round((got / total) * 100);
  return { score, grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 55 ? "C" : "D", checks };
}

type Dupes = { titles: Map<string, number>; descriptions: Map<string, number> };
export function buildDupes(items: { title: string; description: string }[]): Dupes {
  const titles = new Map<string, number>(), descriptions = new Map<string, number>();
  for (const it of items) {
    const t = it.title.trim().toLowerCase(), d = it.description.trim().toLowerCase();
    titles.set(t, (titles.get(t) ?? 0) + 1);
    descriptions.set(d, (descriptions.get(d) ?? 0) + 1);
  }
  return { titles, descriptions };
}
const dupFlags = (d: Dupes | undefined, title: string, description: string) =>
  d ? { duplicateTitle: (d.titles.get(title.trim().toLowerCase()) ?? 0) > 1, duplicateDescription: (d.descriptions.get(description.trim().toLowerCase()) ?? 0) > 1 } : {};

export function productInput(p: Product, f: Franchise | null | undefined, dupes?: Dupes): SeoInput {
  const seo = productSeo(p, f);
  return {
    kind: "product", slug: p.slug, name: p.name, title: seo.title, description: seo.description,
    body: `${p.shortDescription} ${p.description}`.trim(), keyword: p.focusKeyword ?? "",
    images: p.images.map((src, n) => ({ src, alt: p.imageAlts?.[n] ?? "" })), noindex: seo.noindex,
    hasPrice: p.pricePence > 0, hasSku: Boolean(p.sku), ...dupFlags(dupes, seo.title, seo.description),
  };
}
export function franchiseInput(f: Franchise, dupes?: Dupes): SeoInput {
  const seo = franchiseSeo(f);
  return { kind: "franchise", slug: f.slug, name: f.name, title: seo.title, description: seo.description, body: `${f.tagline} ${f.description}`, keyword: f.focusKeyword ?? "", images: [], noindex: seo.noindex, ...dupFlags(dupes, seo.title, seo.description) };
}
export function categoryInput(c: Category, dupes?: Dupes): SeoInput {
  const seo = categorySeo(c);
  return { kind: "category", slug: c.slug, name: c.name, title: seo.title, description: seo.description, body: c.description, keyword: c.focusKeyword ?? "", images: [], noindex: seo.noindex, ...dupFlags(dupes, seo.title, seo.description) };
}
