import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { RecentlyViewed } from "@/components/Recent";
import { getAllProducts, getFranchises } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Your basket"), robots: { index: false, follow: false } };
}

export default async function CartPage() {
  const { t } = await getT();
  const [products, franchises] = await Promise.all([getAllProducts(), getFranchises()]);
  return (
    <>
      <h1 className="display pt-10 text-[clamp(2rem,4.2vw,3.25rem)]">{t("Your basket")}</h1>
      <CartView />
      <RecentlyViewed products={products} franchiseNames={Object.fromEntries(franchises.map((f) => [f.slug, f.name]))} />
    </>
  );
}
