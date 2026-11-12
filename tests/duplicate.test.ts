import { describe, expect, it } from "vitest";
import { duplicateProduct, freshIdentity } from "@/lib/duplicate";
import type { Product } from "@/lib/types";

const base = { slug: "mug", sku: "MUG-1", name: "Mug", published: true, isFeatured: true, isNew: true, printifyId: "p1", launchAt: "2030-01-01", images: ["/a.png"], imageAlts: ["a"], details: ["x"], tags: ["t"], pricePence: 999, variants: [{ name: "Red", sku: "MUG-1-R", stockQty: 3 }, { name: "Blue", sku: "", stockQty: 1 }], bundleItems: [] } as unknown as Product;

describe("duplicate product", () => {
  it("finds a free slug and SKU", () => {
    expect(freshIdentity("mug", "MUG-1", { slugs: [], skus: [] })).toEqual({ slug: "mug-copy", sku: "MUG-1-COPY" });
    expect(freshIdentity("mug", "MUG-1", { slugs: ["mug-copy"], skus: ["mug-1-copy"] })).toEqual({ slug: "mug-copy-2", sku: "MUG-1-COPY-2" });
  });
  it("makes a draft that is not featured, new or linked to Printify", () => {
    const c = duplicateProduct(base, { slugs: ["mug"], skus: ["MUG-1"] }, "2026-11-12");
    expect(c).toMatchObject({ slug: "mug-copy", sku: "MUG-1-COPY", name: "Mug (copy)", published: false, isFeatured: false, isNew: false, createdAt: "2026-11-12", pricePence: 999 });
    expect(c.printifyId).toBeUndefined(); expect(c.launchAt).toBeUndefined();
  });
  it("keeps variants with unique SKUs and does not share arrays with the original", () => {
    const c = duplicateProduct(base, { slugs: [], skus: [] }, "2026-11-12");
    expect(c.variants!.map((v) => v.sku)).toEqual(["MUG-1-R-COPY", ""]);
    c.images.push("/b.png"); expect(base.images).toHaveLength(1);
  });
});
