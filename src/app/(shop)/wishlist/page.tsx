import type { Metadata } from "next";
import { Suspense } from "react";
import { WishlistView } from "@/components/WishlistView";
import { getAllProducts, getFranchises } from "@/lib/catalog";

export const revalidate = 300;
export const metadata: Metadata = { title: "Your favourites", robots: { index: false, follow: false } };

export default async function WishlistPage() {
  const [products, franchises] = await Promise.all([getAllProducts(), getFranchises()]);
  const names = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <h1 className="display pt-10 text-[clamp(2rem,4.2vw,3.25rem)]">Your favourites</h1>
      <Suspense fallback={null}>
        <WishlistView products={products} franchiseNames={names} />
      </Suspense>
    </>
  );
}
