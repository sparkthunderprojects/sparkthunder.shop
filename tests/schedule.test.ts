import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/clients";
import { createFakeClient } from "@/lib/db/fake";
import { endSale, runScheduled, salePrice, startSale } from "@/lib/schedule";

const g = globalThis as unknown as { __sparkFake?: unknown };
let db: Db;
const T0 = Date.parse("2026-12-01T10:00:00Z"), H = 3600_000;
const at = (ms: number) => new Date(ms).toISOString();
const add = (o: Record<string, unknown>) => db.from("scheduled_changes").insert({ id: crypto.randomUUID(), status: "pending", before: null, result: "", percent_off: null, ends_at: null, ...o });
const product = async (slug: string) => ((await db.from("products").select("*").eq("slug", slug).maybeSingle()).data) as Record<string, unknown>;
const row = async () => ((await db.from("scheduled_changes").select("*")).data as Record<string, unknown>[])[0];
const SLUG = "knightverge-crest-tee"; const slug = () => SLUG;

beforeEach(() => { g.__sparkFake = undefined; db = createFakeClient() as unknown as Db; });

describe("sale prices", () => {
  it("rounds and never goes below 1p", () => { expect(salePrice(2499, 20)).toBe(1999); expect(salePrice(1, 90)).toBe(1); });
  it("starts a sale with the old price as the was-price, and undoes it", () => {
    const p = { price_pence: 2000, compare_price_pence: null, variants: [{ name: "M", pricePence: 3000 }, { name: "S" }] };
    const s = startSale(p, 25);
    expect(s.patch.price_pence).toBe(1500); expect(s.patch.compare_price_pence).toBe(2000);
    expect(s.patch.variants[0]).toMatchObject({ pricePence: 2250, comparePricePence: 3000 });
    const back = endSale({ price_pence: 1500, compare_price_pence: 2000, variants: s.patch.variants }, s.before);
    expect(back.patch.price_pence).toBe(2000); expect(back.patch.compare_price_pence).toBeNull();
    expect((back.patch.variants as { pricePence: number }[])[0].pricePence).toBe(3000); expect(back.kept).toBe(false);
  });
  it("leaves a price alone if someone changed it by hand during the sale", () => {
    const s = startSale({ price_pence: 2000, compare_price_pence: null }, 25);
    const back = endSale({ price_pence: 1234, compare_price_pence: 2000 }, s.before);
    expect(back.patch.price_pence).toBeUndefined(); expect(back.kept).toBe(true);
  });
});

describe("running scheduled changes", () => {
  it("shows a hidden product at its time, once, and not before", async () => {
    await db.from("products").update({ published: false }).eq("slug", slug());
    await add({ action: "show_product", target: slug(), run_at: at(T0 + H) });
    expect(await runScheduled(db, T0)).toMatchObject({ started: 0 });
    expect((await product(slug())).published).toBe(false);
    expect(await runScheduled(db, T0 + 2 * H)).toMatchObject({ started: 1 });
    expect((await product(slug())).published).toBe(true);
    expect((await row()).status).toBe("done");
    expect(await runScheduled(db, T0 + 3 * H)).toMatchObject({ started: 0, ended: 0 });
  });
  it("hides a product for a window and shows it again after", async () => {
    await add({ action: "hide_product", target: slug(), run_at: at(T0), ends_at: at(T0 + 5 * H) });
    await runScheduled(db, T0 + H);
    expect((await product(slug())).published).toBe(false); expect((await row()).status).toBe("live");
    await runScheduled(db, T0 + 6 * H);
    expect((await product(slug())).published).toBe(true); expect((await row()).status).toBe("done");
  });
  it("runs a sale and restores the price afterwards", async () => {
    const before = (await product(slug())).price_pence as number;
    await add({ action: "sale", target: slug(), run_at: at(T0), ends_at: at(T0 + 24 * H), percent_off: 20 });
    await runScheduled(db, T0 + H);
    const during = await product(slug());
    expect(during.price_pence).toBe(salePrice(before, 20)); expect(during.compare_price_pence).toBe(before);
    expect((await runScheduled(db, T0 + 2 * H)).started).toBe(0); // never discounted twice
    expect((await product(slug())).price_pence).toBe(salePrice(before, 20));
    await runScheduled(db, T0 + 25 * H);
    const after = await product(slug());
    expect(after.price_pence).toBe(before); expect(after.compare_price_pence ?? null).toBeNull();
  });
  it("shows and hides collections", async () => {
    const c = ((await db.from("collections").select("slug")).data as { slug: string }[])[0].slug;
    await db.from("collections").update({ published: false }).eq("slug", c);
    await add({ action: "show_collection", target: c, run_at: at(T0) });
    await runScheduled(db, T0 + H);
    expect(((await db.from("collections").select("*").eq("slug", c).maybeSingle()).data as { published: boolean }).published).toBe(true);
  });
  it("skips a window that already passed (the scheduler was down) and marks a missing target as failed", async () => {
    await add({ action: "sale", target: slug(), run_at: at(T0), ends_at: at(T0 + H), percent_off: 50 });
    await add({ action: "show_product", target: "no-such-thing", run_at: at(T0) });
    const r = await runScheduled(db, T0 + 10 * H);
    expect(r).toMatchObject({ skipped: 1, failed: 1, started: 0 });
    expect((await product(slug())).compare_price_pence ?? null).toBeNull();
  });
});
