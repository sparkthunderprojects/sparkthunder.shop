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
  create table public.orders (id uuid primary key default gen_random_uuid(), store_id text not null references public.stores(id), number text not null, created_at timestamptz not null default now());
  create table public.gift_cards (id uuid primary key default gen_random_uuid());
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
