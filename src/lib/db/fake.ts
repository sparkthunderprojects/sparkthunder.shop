// A tiny in-memory stand-in for the parts of the Supabase client the app uses (demo mode only).
import { seedCatalog } from "@/data/seed";
import { categoryToRow, franchiseToRow, productToRow } from "@/lib/db/mappers";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null; count?: number | null };

const PK: Record<string, string> = { products: "slug", franchises: "slug", categories: "slug", media: "id", redirects: "id", settings: "key", subscribers: "email", admin_users: "user_id", gift_cards: "id", gift_card_ledger: "id", orders: "id", checkout_snapshots: "id", collections: "slug", stock_alerts: "id", reviews: "id", reward_points: "id", product_questions: "id", stores: "id", store_secrets: "store_id" };
/** Rows created before multi-store (and the seed catalogue) belong to the default store. */
const sid = (r: Row) => (r.store_id as string | undefined) ?? "sparkthunder";

type Store = Record<string, Row[]>;
const g = globalThis as unknown as { __sparkFake?: Store; __sparkSeq?: number };

function store(): Store {
  if (!g.__sparkFake) {
    const now = new Date().toISOString();
    g.__sparkFake = {
      franchises: seedCatalog.franchises.map((f) => ({ ...franchiseToRow(f), updated_at: now })),
      categories: seedCatalog.categories.map((c) => ({ ...categoryToRow(c), updated_at: now })),
      products: seedCatalog.products.map((p) => ({ ...productToRow(p), updated_at: `${p.createdAt}T00:00:00.000Z` })),
      media: [], redirects: [], settings: [], subscribers: [], admin_users: [], gift_cards: [], gift_card_ledger: [], orders: [], checkout_snapshots: [],
      collections: (seedCatalog.collections ?? []).map((c) => ({ slug: c.slug, name: c.name, description: c.description, image: c.image, launch_at: c.launchAt ?? null, product_slugs: c.productSlugs, sort_order: c.sortOrder, published: c.published })),
      stock_alerts: [], discount_codes: [], reviews: [], reward_points: [], product_questions: [],
      store_secrets: [], order_refunds: [], refund_restocks: [], audit_log: [], system_events: [],
      stores: [
        { id: "sparkthunder", name: "Sparkthunder Shop", domains: ["localhost", "127.0.0.1", "sparkthunder.shop"], is_default: true, created_at: now },
        { id: "misspetty", name: "Miss Petty", domains: ["petty.localhost", "misspetty.com"], is_default: false, created_at: now },
      ],
    };
    // SPARKTHUNDER_DEMO_ORDER=1 adds one paid order (for trying shipping and refunds without a payment account).
    if (process.env.SPARKTHUNDER_DEMO_ORDER) {
      g.__sparkFake.orders.push({
        id: "00000000-0000-4000-8000-000000000001", store_id: "sparkthunder", number: "SPK-1001", stripe_session_id: "cs_demo", stripe_payment_intent: "pi_demo_1", status: "paid",
        email: "buyer@example.com", name: "Demo Buyer", phone: "", shipping_address: null, subtotal_pence: 5000, shipping_pence: 0, gift_card_pence: 0, total_pence: 5000,
        gift_card_code: "", discount_pence: 0, tracking_carrier: "", tracking_number: "", notes: "", attention_reason: "", shipped_at: null, created_at: now, updated_at: now,
        fulfilment: {}, fulfil_attempts: 0, fulfilment_lock_until: null, fulfilled_at: now, refunded_card_pence: 0, refunded_gift_pence: 0,
        items: [{ type: "product", slug: seedCatalog.products[0].slug, name: seedCatalog.products[0].name, sku: "DEMO", unitPence: 2500, qty: 2, image: "" }],
      });
    }
    // A second, completely different store so multi-store behaviour can be exercised without a database.
    const S = "misspetty";
    g.__sparkFake.franchises.push({ store_id: S, slug: "face", name: "Face", tagline: "Skin that looks like skin", description: "Complexion makeup for every undertone.", accent: "#e58ba5", sort_order: 1, updated_at: now });
    g.__sparkFake.categories.push({ store_id: S, slug: "lips", name: "Lips", description: "Balms, tints and lipsticks.", sort_order: 1, updated_at: now }, { store_id: S, slug: "cheeks", name: "Cheeks", description: "Blush and bronzer.", sort_order: 2, updated_at: now });
    // Load testing: SPARKTHUNDER_DEMO_STORES=100 adds that many small stores (s1.localhost ... sN.localhost), each with its own products.
    const extra = Math.min(500, Number(process.env.SPARKTHUNDER_DEMO_STORES) || 0);
    for (let i = 1; i <= extra; i++) {
      const id = `shop${i}`;
      g.__sparkFake.stores.push({ id, name: `Shop ${i}`, domains: [`s${i}.localhost`], is_default: false, created_at: now });
      g.__sparkFake.franchises.push({ store_id: id, slug: "main", name: `Shop ${i} Range`, tagline: "", description: "", accent: "#3a5fc8", sort_order: 1, updated_at: now });
      g.__sparkFake.categories.push({ store_id: id, slug: "all", name: "Everything", description: "", sort_order: 1, updated_at: now });
      for (const k of ["a", "b"]) g.__sparkFake.products.push({ store_id: id, slug: `item-${k}`, sku: `S${i}-${k}`.toUpperCase(), name: `Shop ${i} Item ${k.toUpperCase()}`, franchise_slug: "main", category_slug: "all", price_pence: 1000 + i, compare_price_pence: null, short_description: `Item ${k} of shop ${i}.`, description: `Only sold by shop ${i}.`, details: [], images: [], in_stock: true, is_new: true, is_featured: true, published: true, created_at: now, updated_at: now });
    }
    for (const [slug, name, cat, price] of [["velvet-tint", "Velvet Lip Tint", "lips", 1200], ["cloud-blush", "Cloud Blush", "cheeks", 1500], ["petal-balm", "Petal Lip Balm", "lips", 900]] as const) {
      g.__sparkFake.products.push({ store_id: S, slug, sku: `MP-${slug}`.toUpperCase(), name, franchise_slug: "face", category_slug: cat, price_pence: price, compare_price_pence: null, short_description: `${name} from Miss Petty.`, description: `${name}: a soft, buildable finish that lasts all day.`, details: [], images: [], in_stock: true, is_new: true, is_featured: true, published: true, created_at: now, updated_at: now });
    }
    // Demo of options: shades with swatches, a size, per-variant price and a sale price.
    const shade = (name: string, stock: number, extra: Row = {}) => ({ name, sku: `MP-SILK-${name.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`, stockQty: stock, ...extra });
    g.__sparkFake.products.push({ store_id: S, slug: "silk-foundation", sku: "MP-SILK", name: "Silk Skin Foundation", franchise_slug: "face", category_slug: "cheeks", price_pence: 2400, compare_price_pence: null, short_description: "Buildable, skin-like coverage.", description: "A lightweight serum foundation in six shades.", details: [], images: [], in_stock: true, is_new: true, is_featured: true, published: true, created_at: now, track_stock: true, stock_qty: 70, low_stock_threshold: 5, bundle_items: [], tags: [], image_alts: [], updated_at: now,
      option_names: ["Shade", "Size"], option_swatches: { Porcelain: "#f1d6c3", Honey: "#d9a77b", Mocha: "#7a4b32" },
      variants: [shade("Porcelain / 30ml", 10), shade("Porcelain / 50ml", 8, { pricePence: 3400 }), shade("Honey / 30ml", 12), shade("Honey / 50ml", 0, { pricePence: 3400 }), shade("Mocha / 30ml", 5, { comparePricePence: 2800, pricePence: 2400 }), shade("Mocha / 50ml", 7, { pricePence: 3400 })] });
    g.__sparkSeq = 1;
  }
  return g.__sparkFake;
}

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private wantCount = false;
  private head = false;
  private one: "single" | "maybe" | null = null;
  private onConflict: string | null = null;
  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) { if (this.op === "select" || true) { if (this.op === "select") this.op = "select"; } this.wantCount = Boolean(opts?.count); this.head = Boolean(opts?.head); return this; }
  insert(rows: Row | Row[]) { this.op = "insert"; this.payload = rows; return this; }
  update(patch: Row) { this.op = "update"; this.payload = patch; return this; }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) { this.op = "upsert"; this.payload = rows; this.onConflict = opts?.onConflict ?? null; return this; }
  delete() { this.op = "delete"; return this; }
  eq(col: string, val: unknown) { this.filters.push((r) => (col === "store_id" ? sid(r) === val : r[col] === val)); return this; }
  neq(col: string, val: unknown) { this.filters.push((r) => (val === "" ? (r[col] ?? "") !== "" : r[col] !== val)); return this; }
  in(col: string, vals: unknown[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  ilike(col: string, pat: string) { const re = new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i"); this.filters.push((r) => re.test(String(r[col] ?? ""))); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orders.push({ col, asc: opts?.ascending !== false }); return this; }
  gte(col: string, val: unknown) { this.filters.push((r) => String(r[col] ?? "") >= String(val)); return this; }
  lte(col: string, val: unknown) { this.filters.push((r) => String(r[col] ?? "") <= String(val)); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  private run(): Result {
    const rows = store()[this.table] ?? (store()[this.table] = []);
    const pk = PK[this.table] ?? "id";
    const match = (r: Row) => this.filters.every((f) => f(r));
    const now = new Date().toISOString();
    const withDefaults = (r: Row): Row => {
      const out: Row = { ...r };
      if (pk === "id" && out.id == null) out.id = ["media", "gift_cards", "gift_card_ledger", "orders"].includes(this.table) ? `${this.table[0]}-${g.__sparkSeq!++}-${Date.now().toString(36)}` : g.__sparkSeq!++;
      if (!out.created_at && this.table !== "settings") out.created_at = now;
      if (["products", "franchises", "categories"].includes(this.table)) out.updated_at = now;
      // Column defaults the real schema applies.
      if (this.table === "orders") { out.fulfilment ??= {}; out.fulfil_attempts ??= 0; out.fulfilment_lock_until ??= null; out.fulfilled_at ??= null; out.refunded_card_pence ??= 0; out.refunded_gift_pence ??= 0; }
      return out;
    };
    let result: Row[] = [];
    if (this.op === "insert") {
      for (const r of [this.payload].flat() as Row[]) {
        if (rows.some((x) => x[pk] === r[pk] && r[pk] != null && sid(x) === sid(r))) return { data: null, error: { message: `duplicate key value violates unique constraint on ${this.table}.${pk}` } };
        if (this.table === "products" && rows.some((x) => x.sku === r.sku && sid(x) === sid(r))) return { data: null, error: { message: "duplicate key value violates unique constraint \"products_sku_key\"" } };
        if (this.table === "orders" && rows.some((x) => x.number === r.number && sid(x) === sid(r))) return { data: null, error: { message: "duplicate key value violates unique constraint \"orders_number_key\"" } };
        if (this.table === "orders" && r.stripe_session_id && rows.some((x) => x.stripe_session_id === r.stripe_session_id)) return { data: null, error: { message: "duplicate key value violates unique constraint \"orders_stripe_session_id_key\"" } };
        if (this.table === "redirects" && rows.some((x) => x.from_path === r.from_path && sid(x) === sid(r))) return { data: null, error: { message: "duplicate key value violates unique constraint \"redirects_from_path_key\"" } };
        const row = withDefaults(r); rows.push(row); result.push(row);
      }
    } else if (this.op === "upsert") {
      const keys = (this.onConflict ?? pk).split(",").map((k) => k.trim());
      for (const r of [this.payload].flat() as Row[]) {
        const i = rows.findIndex((x) => keys.every((k) => (k === "store_id" ? sid(x) === sid(r) : x[k] === r[k])) && (keys.includes("store_id") || sid(x) === sid(r)));
        if (i >= 0) { rows[i] = { ...rows[i], ...r, ...(["products", "franchises", "categories"].includes(this.table) ? { updated_at: now } : {}) }; result.push(rows[i]); }
        else { const row = withDefaults(r); rows.push(row); result.push(row); }
      }
    } else if (this.op === "update") {
      for (const r of rows.filter(match)) { Object.assign(r, this.payload, ["products", "franchises", "categories"].includes(this.table) ? { updated_at: now } : {}); result.push(r); }
    } else if (this.op === "delete") {
      result = rows.filter(match);
      store()[this.table] = rows.filter((r) => !match(r));
    } else {
      result = rows.filter(match);
      for (const { col, asc } of [...this.orders].reverse()) result = [...result].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : String(a[col] ?? "") > String(b[col] ?? "") ? 1 : 0) * (asc ? 1 : -1));
      if (this.lim != null) result = result.slice(0, this.lim);
    }
    const count = this.wantCount ? result.length : null;
    const clone = (v: unknown) => JSON.parse(JSON.stringify(v));
    if (this.head) return { data: null, error: null, count };
    if (this.one) {
      if (result.length === 0) return this.one === "single" ? { data: null, error: { message: "Row not found" } } : { data: null, error: null };
      return { data: clone(result[0]), error: null, count };
    }
    return { data: clone(result), error: null, count };
  }
  then<T1 = Result, T2 = never>(ok?: ((v: Result) => T1 | PromiseLike<T1>) | null, bad?: ((e: unknown) => T2 | PromiseLike<T2>) | null) {
    return Promise.resolve().then(() => this.run()).then(ok, bad);
  }
}

export function createFakeClient() {
  return {
    from: (table: string) => new Query(table),
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === "next_order_number") {
        const S = String(args.p_store ?? "sparkthunder"), t = store();
        const counters = (t.store_counters ??= []);
        let c = counters.find((r) => r.store_id === S && r.name === "order");
        if (!c) { c = { store_id: S, name: "order", value: 1000 + (t.orders ?? []).filter((o) => sid(o) === S).length }; counters.push(c); }
        c.value = (c.value as number) + 1;
        return { data: c.value, error: null };
      }
      if (name === "reserve_stock" || name === "release_stock") {
        const t = store(), S = String(args.p_store), key = String(args.p_key);
        const holds = (t.stock_reservations ??= []);
        // Same behaviour as the SQL functions: all or nothing, counting other checkouts' unexpired holds.
        t.stock_reservations = holds.filter((h) => !(h.store_id === S && h.hold_key === key));
        if (name === "release_stock") return { data: holds.length - t.stock_reservations.length, error: null };
        const want = new Map<string, { slug: string; variant: string; qty: number }>();
        for (const i of args.p_items as { slug: string; variant?: string; qty: number }[]) {
          const k = `${i.slug}|${i.variant ?? ""}`, cur = want.get(k);
          want.set(k, { slug: i.slug, variant: i.variant ?? "", qty: (cur?.qty ?? 0) + i.qty });
        }
        const short: { slug: string; variant: string; wanted: number; available: number }[] = [];
        const keep: Row[] = [];
        for (const w of [...want.values()].sort((a, b) => (a.slug + a.variant < b.slug + b.variant ? -1 : 1))) {
          const p = (t.products ?? []).find((r) => r.slug === w.slug && sid(r) === S);
          if (!p || !p.track_stock) continue;
          const vs = p.variants as { name: string; stockQty: number }[] | null;
          const onHand = w.variant && vs?.length ? (vs.find((v) => v.name === w.variant)?.stockQty ?? 0) : (p.stock_qty as number);
          const held = t.stock_reservations.filter((h) => h.store_id === S && h.product_slug === w.slug && h.variant === w.variant && new Date(h.expires_at as string) > new Date()).reduce((n, h) => n + (h.qty as number), 0);
          if (w.qty > onHand - held) short.push({ slug: w.slug, variant: w.variant, wanted: w.qty, available: Math.max(0, onHand - held) });
          keep.push({ store_id: S, hold_key: key, product_slug: w.slug, variant: w.variant, qty: w.qty, expires_at: new Date(Date.now() + Number(args.p_minutes) * 60_000).toISOString() });
        }
        if (short.length) return { data: { ok: false, short }, error: null };
        t.stock_reservations.push(...keep);
        return { data: { ok: true }, error: null };
      }
      if (name === "begin_refund") {
        const t = store(), S = String(args.p_store);
        const o = (t.orders ?? []).find((r) => r.id === args.p_order && sid(r) === S);
        if (!o) return { data: { status: "rejected", error: "Order not found." }, error: null };
        const refunds = (t.order_refunds ??= []);
        const seen = refunds.find((r) => r.store_id === S && r.key === args.p_key);
        if (seen) return { data: { status: "existing", id: seen.id }, error: null };
        const card = Number(args.p_card), gift = Number(args.p_gift);
        if (card < 0 || gift < 0 || card + gift === 0) return { data: { status: "rejected", error: "Enter an amount to refund." }, error: null };
        if (card > (o.total_pence as number) - (o.refunded_card_pence as number)) return { data: { status: "rejected", error: `Only ${(o.total_pence as number) - (o.refunded_card_pence as number)} pence can still be refunded to the card.` }, error: null };
        if (gift > (o.gift_card_pence as number) - (o.refunded_gift_pence as number)) return { data: { status: "rejected", error: `Only ${(o.gift_card_pence as number) - (o.refunded_gift_pence as number)} pence can still be refunded to the gift card.` }, error: null };
        const id = `rf_${refunds.length + 1}_${Math.random().toString(36).slice(2, 8)}`;
        refunds.push({ id, store_id: S, order_id: o.id, key: args.p_key, card_pence: card, gift_pence: gift, reason: args.p_reason ?? "", restock: args.p_restock ?? [], take_points: Boolean(args.p_points), source: args.p_source ?? "admin", status: "pending", steps: {}, stripe_refund_id: args.p_stripe_id ?? null, error: "", created_by: args.p_by ?? "", created_at: new Date().toISOString() });
        o.refunded_card_pence = (o.refunded_card_pence as number) + card; o.refunded_gift_pence = (o.refunded_gift_pence as number) + gift;
        return { data: { status: "created", id }, error: null };
      }
      if (name === "fail_refund") {
        const t = store(), r = (t.order_refunds ?? []).find((x) => x.id === args.p_id && x.store_id === args.p_store);
        if (!r || r.status !== "pending" || r.stripe_refund_id) return { data: false, error: null };
        r.status = "failed"; r.error = args.p_error ?? "";
        const o = (t.orders ?? []).find((x) => x.id === r.order_id)!;
        o.refunded_card_pence = Math.max(0, (o.refunded_card_pence as number) - (r.card_pence as number)); o.refunded_gift_pence = Math.max(0, (o.refunded_gift_pence as number) - (r.gift_pence as number));
        return { data: true, error: null };
      }
      if (name === "restock_item") {
        const t = store(), S = String(args.p_store), slug = String(args.p_slug), variant = String(args.p_variant ?? ""), qty = Number(args.p_qty);
        const r = (t.order_refunds ?? []).find((x) => x.id === args.p_refund && x.store_id === S);
        const done = (t.refund_restocks ??= []);
        if (!r || qty <= 0 || done.some((d) => d.refund_id === r.id && d.product_slug === slug && d.variant === variant)) return { data: 0, error: null };
        const o = (t.orders ?? []).find((x) => x.id === r.order_id)!;
        const ordered = (o.items as { type: string; slug: string; variant?: string; qty: number }[]).filter((l) => l.type === "product" && l.slug === slug && (l.variant ?? "") === variant).reduce((n, l) => n + l.qty, 0);
        const already = done.filter((d) => d.order_id === o.id && d.product_slug === slug && d.variant === variant).reduce((n, d) => n + (d.qty as number), 0);
        const add = ordered === 0 ? qty : Math.min(qty, ordered - already);
        if (add <= 0) return { data: 0, error: null };
        done.push({ refund_id: r.id, order_id: o.id, store_id: S, product_slug: slug, variant, qty: add });
        const p = (t.products ?? []).find((x) => x.slug === slug && sid(x) === S);
        if (!p || !p.track_stock) return { data: add, error: null };
        const vs = p.variants as { name: string; stockQty: number }[] | null;
        if (variant && vs?.length) {
          p.variants = vs.map((v) => (v.name === variant ? { ...v, stockQty: v.stockQty + add } : v));
          const total = (p.variants as { stockQty: number }[]).reduce((n, v) => n + v.stockQty, 0);
          p.stock_qty = total; p.in_stock = total > 0;
        } else { p.stock_qty = (p.stock_qty as number) + add; p.in_stock = true; }
        return { data: add, error: null };
      }
      if (name === "rate_hit") {
        const t = store(), W = Number(args.p_window), L = Number(args.p_limit);
        const ws = Math.floor(Date.now() / 1000 / W) * W;
        const rows = (t.rate_limits ??= []);
        let r = rows.find((x) => x.key === args.p_key && x.window_start === ws);
        if (!r) { r = { key: args.p_key, window_start: ws, hits: 0 }; rows.push(r); }
        r.hits = (r.hits as number) + 1;
        return { data: { ok: (r.hits as number) <= L, hits: r.hits, retry_after: Math.max(1, ws + W - Math.floor(Date.now() / 1000)) }, error: null };
      }
      if (name === "use_discount") {
        const t = store(), S = String(args.p_store);
        const reds = (t.discount_redemptions ??= []);
        if (reds.some((r) => r.order_id === args.p_order && r.code_id === args.p_code)) return { data: { status: "repeat" }, error: null };
        reds.push({ store_id: S, code_id: args.p_code, order_id: args.p_order });
        const d = (t.discount_codes ?? []).find((r) => r.id === args.p_code && sid(r) === S);
        if (!d) return { data: { status: "missing" }, error: null };
        d.uses = (d.uses as number) + 1;
        return { data: { status: "counted", uses: d.uses, over: d.max_uses != null && (d.uses as number) > (d.max_uses as number) }, error: null };
      }
      if (name === "take_stock") {
        // Same behaviour as the SQL function: exactly once per (order, product, variant), applied under one lock.
        const t = store(), S = String(args.p_store), slug = String(args.p_slug), variant = String(args.p_variant ?? ""), qty = Number(args.p_qty);
        const moves = (t.stock_movements ??= []);
        if (moves.some((m) => m.order_id === args.p_order && m.product_slug === slug && m.variant === variant)) return { data: -1, error: null };
        const move: Row = { order_id: args.p_order, product_slug: slug, variant, qty, store_id: S, oversold: false };
        moves.push(move);
        const p = (t.products ?? []).find((r) => r.slug === slug && sid(r) === S);
        if (!p || !p.track_stock) return { data: -2, error: null };
        let before = 0;
        const vs = p.variants as { name: string; stockQty: number }[] | null;
        if (variant && vs?.length) {
          before = vs.find((v) => v.name === variant)?.stockQty ?? 0;
          p.variants = vs.map((v) => (v.name === variant ? { ...v, stockQty: Math.max(0, v.stockQty - qty) } : v));
          const total = (p.variants as { stockQty: number }[]).reduce((n, v) => n + v.stockQty, 0);
          p.stock_qty = total; p.in_stock = total > 0;
        } else {
          before = p.stock_qty as number;
          p.stock_qty = Math.max(0, before - qty);
          if (before - qty <= 0) p.in_stock = false;
        }
        move.before_qty = before; move.oversold = before < qty;
        return { data: before, error: null };
      }
      if (name !== "gift_card_lookup") return { data: null, error: { message: `Unknown function ${name}` } };
      const c = (store().gift_cards ?? []).find((r) => r.code === String(args.p_code).toUpperCase() && sid(r) === (args.p_store ?? "sparkthunder"));
      if (!c) return { data: [], error: null };
      const exp = c.expires_at as string | null;
      const status = c.status !== "active" ? "disabled" : exp && new Date(exp) < new Date() ? "expired" : c.balance_pence === 0 ? "used" : "active";
      return { data: [{ balance_pence: c.balance_pence, currency: c.currency ?? "GBP", status, expires_at: exp }], error: null };
    },
    auth: {
      getUser: async () => ({ data: { user: { id: "demo", email: "demo@sparkthunder.shop" } }, error: null }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null }),
    },
    storage: {
      from: (_bucket: string) => ({
        upload: async (p: string, body: Blob | ArrayBuffer | Buffer) => {
          const file = path.join(process.cwd(), "public", "uploads", p);
          await mkdir(path.dirname(file), { recursive: true });
          const buf = body instanceof Blob ? Buffer.from(await body.arrayBuffer()) : Buffer.from(body as ArrayBuffer);
          await writeFile(file, buf);
          return { data: { path: p }, error: null };
        },
        remove: async (_paths: string[]) => ({ data: [], error: null }),
        getPublicUrl: (p: string) => ({ data: { publicUrl: `/uploads/${p}` } }),
      }),
    },
  };
}
