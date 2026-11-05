import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
import { getFranchises, getProducts } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata, itemListLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "New Arrivals - Latest Official Merchandise",
  description: "The newest official Sparkthunder merchandise: fresh apparel, collectibles, prints and tabletop gear from Knightverge, Occult Inc and more.",
  path: "/new",
});

export default async function NewPage() {
  const [products, franchises] = await Promise.all([getProducts({ onlyNew: true }), getFranchises()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "New arrivals", path: "/new" }]), itemListLd("New arrivals", "/new", products)]} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "New arrivals" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">New arrivals</h1>
      <p className="prose-lore mt-6 text-muted">The latest official merchandise to land across every Sparkthunder franchise.</p>
      <div className="mt-10"><Listing products={products} franchiseNames={nameBySlug} flush /></div>
    </>
  );
}
