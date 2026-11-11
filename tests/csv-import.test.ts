import { describe, expect, it } from "vitest";
import { parseCsv, planImport, type ExistingProduct } from "@/lib/csv-import";
import { toCsv } from "@/lib/csv";

const prod = (o: Partial<ExistingProduct>): ExistingProduct => ({ slug: "tee", sku: "TEE", name: "Tee", franchise_slug: "knightverge", category_slug: "apparel", price_pence: 2000, compare_price_pence: null, track_stock: false, stock_qty: 0, in_stock: true, published: true, tags: [], variants: [], ...o });
const FR = [{ slug: "knightverge", name: "Knightverge" }], CA = [{ slug: "apparel", name: "Apparel" }, { slug: "mugs", name: "Mugs" }];
const run = (csv: string, existing = [prod({}), prod({ slug: "mug", sku: "MUG", name: "Mug", price_pence: 1000 }), prod({ slug: "pod", sku: "POD", printify_id: "P1" }), prod({ slug: "sized", sku: "SZ", variants: [{}] })]) => planImport(parseCsv(csv), existing, FR, CA);

describe("csv parsing", () => {
  it("handles quotes, commas, line breaks in cells, BOM and CRLF", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","he said ""hi""\nthere"\r\n')).toEqual([["a", "b"], ["x, y", 'he said "hi"\nthere']]);
  });
  it("reads back what we export", () => {
    const out = toCsv(["Slug", "Name"], [["tee", "=SUM(A1)"]]);
    expect(run(out + "").errors).toEqual([]);
    expect(planImport(parseCsv(out), [prod({ name: "=SUM(A1)" })], FR, CA).unchanged).toBe(1); // the defused cell round-trips
  });
});

describe("planning an import", () => {
  it("updates prices and stock, leaves blank cells alone, and counts unchanged rows", () => {
    const p = run("Slug,Price,Stock,Name\ntee,25.50,10,\nmug,10.00,,\n");
    expect(p.errors).toEqual([]);
    expect(p.updates).toHaveLength(1); expect(p.unchanged).toBe(1);
    expect(p.updates[0].patch).toMatchObject({ price_pence: 2550, stock_qty: 10, track_stock: true });
    expect(p.updates[0].patch.name).toBeUndefined();
  });
  it("reports bad rows with line numbers and skips only those", () => {
    const p = run("Slug,Price,Published\ntee,abc,yes\nmug,12,maybe\nBad Slug,1,yes\ntee,5,yes\n");
    expect(p.errors.map((e) => e.line)).toEqual([2, 3, 4, 5]);
    expect(p.updates).toHaveLength(0);
  });
  it("resolves franchise and category by slug or name, and rejects unknown ones", () => {
    expect(run("Slug,Category\ntee,Mugs\n").updates[0].patch.category_slug).toBe("mugs");
    expect(run("Slug,Category\ntee,Hats\n").errors[0].message).toContain("Unknown category");
  });
  it("blocks duplicate SKUs and duplicate rows", () => {
    expect(run("Slug,SKU\ntee,MUG\n").errors[0].message).toContain("already belongs");
    expect(run("Slug,Price\ntee,5\ntee,6\n").errors[0].message).toContain("twice");
  });
  it("creates a new product only with everything it needs, and starts it hidden", () => {
    expect(run("Slug,Name\nnew-one,New one\n").errors[0].message).toContain("also needs");
    const p = run("Slug,SKU,Name,Franchise,Category,Price\nnew-one,NEW1,New one,Knightverge,Apparel,15\n");
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].row).toMatchObject({ slug: "new-one", franchise_slug: "knightverge", price_pence: 1500, published: false });
  });
  it("protects print-on-demand and option products from stock edits, and warns about price", () => {
    const p = run("Slug,Stock,Price\npod,5,30\nsized,5,\n");
    expect(p.errors[0].message).toContain("per option");
    expect(p.updates[0].notes.join(" ")).toContain("Printify");
    expect(p.updates[0].patch.stock_qty).toBeUndefined();
  });
  it("needs a Slug column", () => { expect(run("Name\nx\n").errors[0].message).toContain("Slug"); });
});
