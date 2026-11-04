import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { RecentlyViewed } from "@/components/Recent";
import { getAllProducts, getFranchises } from "@/lib/catalog";

export const metadata: Metadata = { title: "Your basket", robots: { index: false, follow: false } };

export default async function CartPage() {
  const [products, franchises] = await Promise.all([getAllProducts(), getFranchises()]);
  return (
    <>
      <h1 className="display pt-10 text-[clamp(3rem,8vw,6.5rem)]">Your basket</h1>
      <CartView />
      <RecentlyViewed products={products} franchiseNames={Object.fromEntries(franchises.map((f) => [f.slug, f.name]))} />
    </>
  );
}
