import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

/** Runs the real SQL from supabase/admin.sql (the fulfilment block) in an in-memory Postgres. */
const sql = readFileSync(path.join(__dirname, "../supabase/admin.sql"), "utf8");
const block = sql.slice(sql.indexOf("-- Reliable fulfilment (idempotent)") - 80);

const PRELUDE = `
  create role anon; create role authenticated; create role service_role;
  create table public.stores (id text primary key);
  insert into public.stores values ('sparkthunder'), ('misspetty');
  create function public.can_admin_store(sid text) returns boolean language sql as $$ select true $$;
  create table public.products (
    store_id text not null references public.stores(id), slug text not null, track_stock boolean not null default false,
    stock_qty int not null default 0, in_stock boolean not null default true, variants jsonb not null default '[]',
    primary key (store_id, slug));
  create table public.orders (id uuid primary key default gen_random_uuid(), store_id text not null references public.stores(id), number text not null, created_at timestamptz not null default now(), total_pence int not null default 0, gift_card_pence int not null default 0, items jsonb not null default '[]');
  create table public.gift_cards (id uuid primary key default gen_random_uuid());
  create table public.discount_codes (id uuid primary key default gen_random_uuid(), store_id text not null references public.stores(id), code text not null, uses int not null default 0, max_uses int);
`;

let db: PGlite;
const one = async <T = Record<string, unknown>>(q: string, p: unknown[] = []) => (await db.query<T>(q, p)).rows[0];
const order = async (store = "sparkthunder") => (await one<{ id: string }>("insert into orders (store_id, number) values ($1, 'X') returning id", [store])).id;
const stock = async (slug: string, store = "sparkthunder") => one<{ stock_qty: number; in_stock: boolean; variants: { name: string; stockQty: number }[] }>("select stock_qty, in_stock, variants from products where store_id=$1 and slug=$2", [store, slug]);
const take = async (o: string, slug: string, variant: string, qty: number, store = "sparkthunder") => (await one<{ take_stock: number }>("select take_stock($1,$2,$3,$4,$5)", [store, o, slug, variant, qty])).take_stock;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec("insert into orders (store_id, number) values ('sparkthunder', 'OLD-1'), ('sparkthunder', 'OLD-2')");
  await db.exec(block);
  await db.exec(`insert into products (store_id, slug, track_stock, stock_qty) values ('sparkthunder','tee',true,5), ('sparkthunder','poster',false,9), ('misspetty','tee',true,50);
    insert into products (store_id, slug, track_stock, stock_qty, variants) values ('sparkthunder','hoodie',true,6,'[{"name":"Black / M","sku":"a","stockQty":3},{"name":"Black / L","sku":"b","stockQty":3}]');`);
});

describe("take_stock (real SQL)", () => {
  it("takes stock off once per order and product, however often it is called", async () => {
    const o = await order();
    expect(await take(o, "tee", "", 2)).toBe(5);       // returns the stock before
    expect(await take(o, "tee", "", 2)).toBe(-1);      // repeat: already applied
    expect((await stock("tee")).stock_qty).toBe(3);
  });
  it("only touches the right store", async () => {
    await take(await order(), "tee", "", 2);
    expect((await stock("tee", "misspetty")).stock_qty).toBe(50);
  });
  it("never goes below zero, marks sold out, and reports the oversell", async () => {
    const o = await order();
    expect(await take(o, "tee", "", 8)).toBe(5);
    const s = await stock("tee");
    expect(s.stock_qty).toBe(0); expect(s.in_stock).toBe(false);
    expect((await one<{ oversold: boolean }>("select oversold from stock_movements where order_id=$1", [o])).oversold).toBe(true);
  });
  it("leaves untracked products alone", async () => {
    expect(await take(await order(), "poster", "", 3)).toBe(-2);
    expect((await stock("poster")).stock_qty).toBe(9);
  });
  it("takes stock off one variant and keeps the total in step", async () => {
    await take(await order(), "hoodie", "Black / M", 2);
    const s = await stock("hoodie");
    expect(s.variants.map((v) => v.stockQty)).toEqual([1, 3]);
    expect(s.stock_qty).toBe(4); expect(s.in_stock).toBe(true);
  });
  it("sells the product out when every variant has sold out", async () => {
    await take(await order(), "hoodie", "Black / M", 3); await take(await order(), "hoodie", "Black / L", 3);
    const s = await stock("hoodie");
    expect(s.stock_qty).toBe(0); expect(s.in_stock).toBe(false);
  });
  it("is not callable from a browser role", async () => {
    await expect(db.exec("set role anon; select take_stock('sparkthunder', gen_random_uuid(), 'tee', '', 1)")).rejects.toThrow(/permission denied/i);
  });
});

describe("next_order_number and the migration (real SQL)", () => {
  it("continues after existing orders and counts up", async () => {
    const n = async (store = "sparkthunder") => (await one<{ next_order_number: number }>("select next_order_number($1)", [store])).next_order_number;
    expect(await n()).toBe(1003);                      // two orders already existed
    expect(await n()).toBe(1004);
    expect(await n("misspetty")).toBe(1001);           // each store counts on its own
  });
  it("treats orders from before the upgrade as finished, and never re-finishes later ones when run again", async () => {
    expect((await one<{ n: number }>("select count(*)::int n from orders where fulfilled_at is null")).n).toBe(0);
    await db.exec("insert into orders (store_id, number) values ('sparkthunder', 'NEW-1')"); // an order in progress
    await db.exec(block);                                                                       // admin.sql is run again
    expect((await one<{ n: number }>("select count(*)::int n from orders where fulfilled_at is null")).n).toBe(1);
  });
});

describe("stock holds (real SQL)", () => {
  const hold = async (key: string, items: { slug: string; variant?: string; qty: number }[], store = "sparkthunder") =>
    (await one<{ reserve_stock: { ok: boolean; short?: { slug: string; available: number; wanted: number }[] } }>("select reserve_stock($1,$2,$3::jsonb,35)", [store, key, JSON.stringify(items)])).reserve_stock;
  const release = async (key: string, store = "sparkthunder") => (await one<{ release_stock: number }>("select release_stock($1,$2)", [store, key])).release_stock;

  it("holds stock for one checkout so a second shopper cannot take the same units", async () => {
    expect((await hold("a", [{ slug: "tee", qty: 4 }])).ok).toBe(true);
    const b = await hold("b", [{ slug: "tee", qty: 2 }]);            // 5 in stock, 4 held by a
    expect(b.ok).toBe(false);
    expect(b.short).toEqual([{ slug: "tee", variant: "", wanted: 2, available: 1 }]);
    expect((await hold("c", [{ slug: "tee", qty: 1 }])).ok).toBe(true);
  });
  it("is all or nothing: nothing is held when any item is short", async () => {
    await hold("a", [{ slug: "tee", qty: 5 }]);
    expect((await hold("b", [{ slug: "poster", qty: 1 }, { slug: "tee", qty: 1 }])).ok).toBe(false);
    expect((await one<{ n: number }>("select count(*)::int n from stock_reservations where hold_key='b'")).n).toBe(0);
  });
  it("frees the stock when released, and when the hold runs out", async () => {
    await hold("a", [{ slug: "tee", qty: 5 }]);
    expect((await hold("b", [{ slug: "tee", qty: 1 }])).ok).toBe(false);
    expect(await release("a")).toBe(1);
    expect(await release("a")).toBe(0);                               // safe to repeat
    expect((await hold("b", [{ slug: "tee", qty: 5 }])).ok).toBe(true);
    await db.exec("update stock_reservations set expires_at = now() - interval '1 minute'");
    expect((await hold("c", [{ slug: "tee", qty: 5 }])).ok).toBe(true);
  });
  it("lets the same shopper hold again without blocking themselves", async () => {
    await hold("a", [{ slug: "tee", qty: 5 }]);
    expect((await hold("a", [{ slug: "tee", qty: 5 }])).ok).toBe(true);
  });
  it("holds per variant, adds up repeated lines, and ignores untracked products", async () => {
    expect((await hold("a", [{ slug: "hoodie", variant: "Black / M", qty: 2 }, { slug: "hoodie", variant: "Black / M", qty: 1 }, { slug: "poster", qty: 99 }])).ok).toBe(true);
    expect((await hold("b", [{ slug: "hoodie", variant: "Black / M", qty: 1 }])).ok).toBe(false);   // 3 in that size, all held
    expect((await hold("b", [{ slug: "hoodie", variant: "Black / L", qty: 3 }])).ok).toBe(true);    // other size is free
  });
  it("keeps stores apart", async () => {
    await hold("a", [{ slug: "tee", qty: 5 }]);
    expect((await hold("b", [{ slug: "tee", qty: 50 }], "misspetty")).ok).toBe(true);
  });
  it("is not callable from a browser role", async () => {
    await expect(db.exec("set role anon; select reserve_stock('sparkthunder','x','[]'::jsonb,35)")).rejects.toThrow(/permission denied/i);
  });
});

describe("use_discount (real SQL)", () => {
  const code = async (max: number | null, store = "sparkthunder") => (await one<{ id: string }>("insert into discount_codes (store_id, code, max_uses) values ($1,'SAVE',$2) returning id", [store, max])).id;
  const use = async (o: string, c: string, store = "sparkthunder") => (await one<{ use_discount: { status: string; uses?: number; over?: boolean } }>("select use_discount($1,$2,$3)", [store, o, c])).use_discount;
  const uses = async (c: string) => (await one<{ uses: number }>("select uses from discount_codes where id = $1", [c])).uses;

  it("counts once per order, however often it is repeated", async () => {
    const c = await code(null), o = await order();
    expect((await use(o, c)).status).toBe("counted");
    expect((await use(o, c)).status).toBe("repeat");
    expect((await use(o, c)).status).toBe("repeat");
    expect(await uses(c)).toBe(1);
  });
  it("counts every order separately and flags going over the limit", async () => {
    const c = await code(2);
    expect((await use(await order(), c)).over).toBe(false);
    expect((await use(await order(), c)).over).toBe(false);
    expect((await use(await order(), c)).over).toBe(true);
    expect(await uses(c)).toBe(3);
  });
  it("never loses a use when orders arrive at the same moment", async () => {
    const c = await code(null), os = await Promise.all([order(), order(), order(), order(), order()]);
    await Promise.all(os.map((o) => use(o, c)));
    expect(await uses(c)).toBe(5);
  });
  it("does not touch another store's code and is not callable from a browser role", async () => {
    const c = await code(null, "misspetty"), o = await order();
    expect((await use(o, c)).status).toBe("missing");
    await expect(db.exec("set role anon; select use_discount('sparkthunder', gen_random_uuid(), gen_random_uuid())")).rejects.toThrow(/permission denied/i);
  });
});

describe("refunds (real SQL)", () => {
  const mk = async (total = 3500, gift = 1500) => (await one<{ id: string }>(
    "insert into orders (store_id, number, total_pence, gift_card_pence, items) values ('sparkthunder','R1',$1,$2,$3) returning id",
    [total, gift, JSON.stringify([{ type: "product", slug: "tee", variant: "", qty: 2 }, { type: "product", slug: "hoodie", variant: "Black / M", qty: 1 }])])).id;
  const begin = async (o: string, key: string, card: number, gift = 0, store = "sparkthunder") => (await one<{ begin_refund: { status: string; id?: string; error?: string } }>(
    "select begin_refund($1,$2,$3,$4,$5,'',$6,false,'a')", [store, o, key, card, gift, "[]"])).begin_refund;
  const sums = async (o: string) => one<{ refunded_card_pence: number; refunded_gift_pence: number }>("select refunded_card_pence, refunded_gift_pence from orders where id = $1", [o]);

  it("starts a refund once per key and tracks the totals", async () => {
    const o = await mk();
    const a = await begin(o, "k1", 1000, 500), b = await begin(o, "k1", 1000, 500);
    expect(a.status).toBe("created"); expect(b.status).toBe("existing"); expect(b.id).toBe(a.id);
    expect(await sums(o)).toEqual({ refunded_card_pence: 1000, refunded_gift_pence: 500 });
  });
  it("never lets refunds add up to more than was paid, even when started at the same moment", async () => {
    const o = await mk();
    const rs = await Promise.all([begin(o, "a", 2000), begin(o, "b", 2000), begin(o, "c", 2000)]);
    expect(rs.filter((r) => r.status === "created")).toHaveLength(1);
    expect((await sums(o)).refunded_card_pence).toBe(2000);
    expect((await begin(o, "d", 1500)).status).toBe("created");
    expect((await begin(o, "e", 1)).status).toBe("rejected");
    expect((await begin(o, "f", 0, 1501)).status).toBe("rejected");
    expect((await begin(o, "g", 0, 0)).status).toBe("rejected");
  });
  it("fail_refund hands the amount back, but only for a refund Stripe never accepted", async () => {
    const o = await mk();
    const r = await begin(o, "k", 1000);
    expect((await one<{ fail_refund: boolean }>("select fail_refund('sparkthunder',$1,'no')", [r.id])).fail_refund).toBe(true);
    expect((await sums(o)).refunded_card_pence).toBe(0);
    const r2 = await begin(o, "k2", 1000);
    await db.query("update order_refunds set stripe_refund_id = 're_1' where id = $1", [r2.id]);
    expect((await one<{ fail_refund: boolean }>("select fail_refund('sparkthunder',$1,'no')", [r2.id])).fail_refund).toBe(false);
    expect((await sums(o)).refunded_card_pence).toBe(1000);
  });
  it("restock_item puts stock back once per refund, never above what was ordered, per variant", async () => {
    const o = await mk();
    const r1 = (await begin(o, "k1", 100)).id!, r2 = (await begin(o, "k2", 100)).id!, r3 = (await begin(o, "k3", 100)).id!;
    const re = async (r: string, slug: string, v: string, q: number) => (await one<{ restock_item: number }>("select restock_item('sparkthunder',$1,$2,$3,$4)", [r, slug, v, q])).restock_item;
    expect(await re(r1, "tee", "", 1)).toBe(1);
    expect(await re(r1, "tee", "", 1)).toBe(0);              // same refund again: nothing
    expect(await re(r2, "tee", "", 5)).toBe(1);              // only 1 more was ordered
    expect(await re(r3, "tee", "", 1)).toBe(0);              // none left to restock
    expect((await stock("tee")).stock_qty).toBe(7);          // 5 + 2
    expect(await re(r1, "hoodie", "Black / M", 1)).toBe(1);
    const h = await stock("hoodie");
    expect(h.variants.find((v) => v.name === "Black / M")!.stockQty).toBe(4);
    expect(h.stock_qty).toBe(7);
  });
  it("is not callable from a browser role", async () => {
    await expect(db.exec("set role anon; select begin_refund('sparkthunder', gen_random_uuid(), 'x', 1, 0, '', '[]', false, '')")).rejects.toThrow(/permission denied/i);
  });
});

describe("rate_hit (real SQL)", () => {
  const hit = async (k: string, limit = 3, win = 60) => (await one<{ rate_hit: { ok: boolean; hits: number; retry_after: number } }>("select rate_hit($1,$2,$3)", [k, limit, win])).rate_hit;
  it("allows up to the limit then blocks, with a sensible wait", async () => {
    for (let i = 1; i <= 3; i++) expect((await hit("a")).ok).toBe(true);
    const r = await hit("a");
    expect(r.ok).toBe(false); expect(r.hits).toBe(4);
    expect(r.retry_after).toBeGreaterThanOrEqual(1); expect(r.retry_after).toBeLessThanOrEqual(60);
  });
  it("keeps keys apart and counts a burst exactly", async () => {
    await Promise.all(Array.from({ length: 10 }, () => hit("burst", 100)));
    expect((await hit("burst", 100)).hits).toBe(11);
    expect((await hit("other")).hits).toBe(1);
  });
  it("is not callable from a browser role", async () => {
    await expect(db.exec("set role anon; select rate_hit('x', 1, 60)")).rejects.toThrow(/permission denied/i);
  });
});
