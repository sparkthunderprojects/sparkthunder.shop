import type { Metadata } from "next";
import { CompareView } from "@/components/CompareView";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";

export const revalidate = 300;
export const metadata: Metadata = { title: "Compare products", robots: { index: false, follow: false } };

export default async function ComparePage() {
  const [products, franchises, categories] = await Promise.all([getAllProducts(), getFranchises(), getCategories()]);
  return (
    <>
      <h1 className="display pt-10 text-[clamp(3rem,8vw,6.5rem)]">Compare products</h1>
      <p className="prose-lore mt-4 text-muted">Side by side, up to four official products.</p>
      <CompareView
        products={products}
        franchiseNames={Object.fromEntries(franchises.map((f) => [f.slug, f.name]))}
        categoryNames={Object.fromEntries(categories.map((c) => [c.slug, c.name]))}
      />
    </>
  );
}
