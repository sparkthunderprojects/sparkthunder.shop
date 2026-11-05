// A tiny in-memory stand-in for the parts of the Supabase client the app uses (demo mode only).
import { seedCatalog } from "@/data/seed";
import { categoryToRow, franchiseToRow, productToRow } from "@/lib/db/mappers";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null; count?: number | null };

const PK: Record<string, string> = { products: "slug", franchises: "slug", categories: "slug", media: "id", redirects: "id", settings: "key", subscribers: "email", admin_users: "user_id", gift_cards: "id", gift_card_ledger: "id", orders: "id", checkout_snapshots: "id" };

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
    };
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
  eq(col: string, val: unknown) { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: unknown) { this.filters.push((r) => r[col] !== val); return this; }
  in(col: string, vals: unknown[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  ilike(col: string, pat: string) { const re = new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i"); this.filters.push((r) => re.test(String(r[col] ?? ""))); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orders.push({ col, asc: opts?.ascending !== false }); return this; }
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
      return out;
    };
    let result: Row[] = [];
    if (this.op === "insert") {
      for (const r of [this.payload].flat() as Row[]) {
        if (rows.some((x) => x[pk] === r[pk] && r[pk] != null)) return { data: null, error: { message: `duplicate key value violates unique constraint on ${this.table}.${pk}` } };
        if (this.table === "products" && rows.some((x) => x.sku === r.sku)) return { data: null, error: { message: "duplicate key value violates unique constraint \"products_sku_key\"" } };
        if (this.table === "orders" && rows.some((x) => x.number === r.number)) return { data: null, error: { message: "duplicate key value violates unique constraint \"orders_number_key\"" } };
        if (this.table === "redirects" && rows.some((x) => x.from_path === r.from_path)) return { data: null, error: { message: "duplicate key value violates unique constraint \"redirects_from_path_key\"" } };
        const row = withDefaults(r); rows.push(row); result.push(row);
      }
    } else if (this.op === "upsert") {
      const key = this.onConflict ?? pk;
      for (const r of [this.payload].flat() as Row[]) {
        const i = rows.findIndex((x) => x[key] === r[key]);
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
      if (name !== "gift_card_lookup") return { data: null, error: { message: `Unknown function ${name}` } };
      const c = (store().gift_cards ?? []).find((r) => r.code === String(args.p_code).toUpperCase());
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
