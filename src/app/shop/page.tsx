import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata, itemListLd } from "@/lib/seo";
import { GRID } from "@/lib/ui";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "All Official Merchandise",
  description: "Browse every official Sparkthunder product in one place: apparel, collectibles, drinkware, prints and tabletop gear from Knightverge, Grim Gala and more.",
  path: "/shop",
});

export default async function ShopPage() {
  const [products, categories, franchises] = await Promise.all([getAllProducts(), getCategories(), getFranchises()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "All merchandise", path: "/shop" }]), itemListLd("All merchandise", "/shop", products)]} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "All merchandise" }]} /></div>
      <h1 className="display mt-6 text-[clamp(3.5rem,9vw,8rem)]">All merchandise</h1>
      <p className="prose-lore mt-6 text-muted">Every official product from every Sparkthunder franchise. Narrow it down by type or by universe.</p>
      <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-2 border-y-2 border-ink py-4" aria-label="Browse by type or franchise">
        {categories.map((c) => <li key={c.slug}><Link href={`/categories/${c.slug}`} className="font-bold hover:underline hover:underline-offset-4">{c.name}</Link></li>)}
        <li aria-hidden className="text-muted">|</li>
        {franchises.map((f) => <li key={f.slug}><Link href={`/franchises/${f.slug}`} className="font-bold text-muted hover:text-ink hover:underline hover:underline-offset-4">{f.name}</Link></li>)}
      </ul>
      <div className={`mt-10 ${GRID}`}>
        {products.map((p, i) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} priority={i < 6} />)}
      </div>
    </>
  );
}
