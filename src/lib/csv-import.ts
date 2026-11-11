/** Read CSV text (quotes, commas and line breaks inside quotes, BOM, CRLF) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

/** Our own exports defuse formulas by prefixing a quote; undo that on the way back in. */
const unquote = (s: string) => s.trim().replace(/^'(?=[=+\-@])/, "");

export type ExistingProduct = {
  slug: string; sku: string; name: string; franchise_slug: string; category_slug: string; price_pence: number; compare_price_pence: number | null;
  track_stock: boolean; stock_qty: number; in_stock: boolean; published: boolean; tags: string[]; variants: unknown[]; printify_id?: string;
};
export type Change = { field: string; from: string; to: string };
export type ImportPlan = {
  updates: { slug: string; line: number; patch: Record<string, unknown>; changes: Change[]; notes: string[] }[];
  creates: { line: number; row: Record<string, unknown>; name: string }[];
  errors: { line: number; message: string }[];
  unchanged: number;
};

const HEADERS: Record<string, string> = {
  slug: "slug", sku: "sku", name: "name", franchise: "franchise", category: "category", price: "price", "compare price": "compare", compare: "compare",
  stock: "stock", "in stock": "inStock", published: "published", tags: "tags", description: "description",
};
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const yes = (s: string) => /^(yes|y|true|1)$/i.test(s.trim()), no = (s: string) => /^(no|n|false|0)$/i.test(s.trim());
const toPence = (s: string) => { const t = s.replace(/[£,\s]/g, ""); if (!/^\d+(\.\d{1,2})?$/.test(t)) return null; return Math.round(Number(t) * 100); };
const pounds = (p: number | null) => (p == null ? "" : (p / 100).toFixed(2));

/**
 * Work out what a CSV would do, without doing it. Columns (any subset, in any order): Slug (required), SKU, Name, Franchise, Category,
 * Price, Compare price, Stock, In stock, Published, Tags, Description. A slug we already have is updated (blank cells are left alone);
 * a new slug creates a product (needs SKU, Name, Franchise, Category and Price). Franchise and Category may be a slug or a name.
 */
export function planImport(rows: string[][], existing: ExistingProduct[], franchises: { slug: string; name: string }[], categories: { slug: string; name: string }[]): ImportPlan {
  const plan: ImportPlan = { updates: [], creates: [], errors: [], unchanged: 0 };
  if (rows.length < 2) { plan.errors.push({ line: 1, message: "The file needs a header row and at least one product." }); return plan; }
  const cols = rows[0].map((h) => HEADERS[h.trim().toLowerCase()] ?? "");
  if (!cols.includes("slug")) { plan.errors.push({ line: 1, message: "The first row must include a Slug column." }); return plan; }
  const bySlug = new Map(existing.map((p) => [p.slug, p]));
  const skus = new Map(existing.map((p) => [p.sku.toLowerCase(), p.slug]));
  const resolve = (list: { slug: string; name: string }[], v: string) => list.find((x) => x.slug === v.trim().toLowerCase() || x.name.toLowerCase() === v.trim().toLowerCase())?.slug;
  const seen = new Set<string>();
  if (rows.length > 2001) { plan.errors.push({ line: 1, message: "Import up to 2,000 products at a time." }); return plan; }

  rows.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const g = (k: string) => { const i = cols.indexOf(k); return i >= 0 ? unquote(cells[i] ?? "") : ""; };
    const has = (k: string) => g(k) !== "";
    const err = (message: string) => plan.errors.push({ line, message });
    const slug = g("slug").toLowerCase();
    if (!SLUG.test(slug)) return err(`"${g("slug")}" is not a valid slug (lowercase letters, numbers and dashes).`);
    if (seen.has(slug)) return err(`${slug} appears twice in the file.`);
    seen.add(slug);

    const patch: Record<string, unknown> = {}, changes: Change[] = [], notes: string[] = [];
    const cur = bySlug.get(slug);
    let bad = false;
    const set = (field: string, col: string, from: string, to: string, v: unknown) => { patch[col] = v; if (from !== to) changes.push({ field, from, to }); };
    const fail = (m: string) => { err(m); bad = true; };

    if (has("name")) set("Name", "name", cur?.name ?? "", g("name").slice(0, 160), g("name").slice(0, 160));
    if (has("sku")) {
      const sku = g("sku").slice(0, 60), owner = skus.get(sku.toLowerCase());
      if (owner && owner !== slug) fail(`SKU ${sku} already belongs to ${owner}.`); else set("SKU", "sku", cur?.sku ?? "", sku, sku);
    }
    if (has("franchise")) { const f = resolve(franchises, g("franchise")); if (!f) fail(`Unknown franchise "${g("franchise")}".`); else set("Franchise", "franchise_slug", cur?.franchise_slug ?? "", f, f); }
    if (has("category")) { const c = resolve(categories, g("category")); if (!c) fail(`Unknown category "${g("category")}".`); else set("Category", "category_slug", cur?.category_slug ?? "", c, c); }
    if (has("price")) { const p = toPence(g("price")); if (p === null || p <= 0 || p > 1_000_000) fail(`"${g("price")}" is not a valid price.`); else set("Price", "price_pence", pounds(cur?.price_pence ?? null), pounds(p), p); }
    if (has("compare")) { const p = toPence(g("compare")); if (p === null || p > 1_000_000) fail(`"${g("compare")}" is not a valid compare price.`); else set("Compare price", "compare_price_pence", pounds(cur?.compare_price_pence ?? null), pounds(p || null), p || null); }
    if (has("stock")) {
      const n = Number(g("stock"));
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) fail(`"${g("stock")}" is not a whole number for stock.`);
      else if (cur?.printify_id) notes.push("Stock ignored: this is a print-on-demand product, always available.");
      else if (cur && cur.variants.length) fail(`${slug} has options, so stock is set per option in the editor.`);
      else { set("Stock", "stock_qty", cur?.track_stock ? String(cur.stock_qty) : "not tracked", String(n), n); patch.track_stock = true; }
    }
    if (has("inStock")) { const v = g("inStock"); if (yes(v) || no(v)) set("In stock", "in_stock", cur?.in_stock ? "yes" : "no", yes(v) ? "yes" : "no", yes(v)); else fail(`In stock must be yes or no, not "${v}".`); }
    if (has("published")) { const v = g("published"); if (yes(v) || no(v)) set("Published", "published", cur?.published ? "yes" : "no", yes(v) ? "yes" : "no", yes(v)); else fail(`Published must be yes or no, not "${v}".`); }
    if (has("tags")) { const t = g("tags").split(/[;,|]/).map((x) => x.trim()).filter(Boolean).slice(0, 20); set("Tags", "tags", (cur?.tags ?? []).join(", "), t.join(", "), t); }
    if (has("description")) set("Description", "description", "", "(updated)", g("description").slice(0, 5000));
    if (bad) return;
    if (cur?.printify_id && patch.price_pence !== undefined) notes.push("Price will be reset to Printify's price the next time you import from Printify.");

    if (cur) {
      if (!changes.length) { plan.unchanged++; return; }
      plan.updates.push({ slug, line, patch, changes, notes });
      return;
    }
    // New product: everything a product needs must be there.
    const missing = ["sku", "name", "franchise", "category", "price"].filter((k) => !has(k));
    if (missing.length) return err(`${slug} is new, so it also needs: ${missing.join(", ")}.`);
    plan.creates.push({ line, name: g("name"), row: { slug, short_description: (patch.description as string | undefined)?.split("\n")[0].slice(0, 160) ?? "", description: "", details: [], images: [], is_new: true, is_featured: false, published: false, in_stock: true, tags: [], track_stock: false, stock_qty: 0, low_stock_threshold: 5, variants: [], option_names: [], option_swatches: {}, bundle_items: [], ...patch } });
  });
  return plan;
}
