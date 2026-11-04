import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getFranchises, getProducts } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata, itemListLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "New Arrivals - Latest Official Merchandise",
  description: "The newest official Sparkthunder merchandise: fresh apparel, collectibles, prints and tabletop gear from Knightverge, Grim Gala and more.",
  path: "/new",
});

export default async function NewPage() {
  const [products, franchises] = await Promise.all([getProducts({ onlyNew: true }), getFranchises()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "New arrivals", path: "/new" }]), itemListLd("New arrivals", "/new", products)]} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "New arrivals" }]} />
      <h1 className="text-4xl font-extrabold">New arrivals</h1>
      <p className="mt-3 max-w-2xl text-muted">The latest official merchandise to land across every Sparkthunder franchise.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((p, i) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} priority={i < 4} />)}
      </div>
    </>
  );
}
