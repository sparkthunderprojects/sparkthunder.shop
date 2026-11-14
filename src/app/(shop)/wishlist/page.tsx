import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WishlistView } from "@/components/WishlistView";
import { getAllProducts, getFranchises } from "@/lib/catalog";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Your favourites"), robots: { index: false, follow: false } };
}

export default async function WishlistPage() {
  const { t } = await getT();
  const [products, franchises] = await Promise.all([getAllProducts(), getFranchises()]);
  const names = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <h1 className="display pt-10 text-[clamp(2rem,4.2vw,3.25rem)]">{t("Your favourites")}</h1>
      <Suspense fallback={null}>
        <WishlistView products={products} franchiseNames={names} />
      </Suspense>
    </>
  );
}
