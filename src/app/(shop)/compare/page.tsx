import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { CompareView } from "@/components/CompareView";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Compare products"), robots: { index: false, follow: false } };
}

export default async function ComparePage() {
  const { t } = await getT();
  const [products, franchises, categories] = await Promise.all([getAllProducts(), getFranchises(), getCategories()]);
  return (
    <>
      <h1 className="display pt-10 text-[clamp(2rem,4.2vw,3.25rem)]">{t("Compare products")}</h1>
      <p className="prose-lore mt-4 text-muted">{t("Side by side, up to four official products.")}</p>
      <CompareView
        products={products}
        franchiseNames={Object.fromEntries(franchises.map((f) => [f.slug, f.name]))}
        categoryNames={Object.fromEntries(categories.map((c) => [c.slug, c.name]))}
      />
    </>
  );
}
