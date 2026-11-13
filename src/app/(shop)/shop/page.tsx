import { FranchiseLogo } from "@/components/FranchiseLogo";
import Link from "@/components/LocaleLink";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { breadcrumbLd, itemListLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { worldStyle } from "@/lib/theme";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
  title: "All Official Merchandise",
  description: "Browse every official Sparkthunder product in one place: apparel, collectibles, drinkware, prints and tabletop gear from Knightverge, Occult Inc and more.",
  path: "/shop",
});
}

export default async function ShopPage() {
  const [products, categories, franchises] = await Promise.all([getAllProducts(), getCategories(), getFranchises()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const countIn = (pick: (p: (typeof products)[number]) => boolean) => products.filter(pick).length;

  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "All merchandise", path: "/shop" }]), itemListLd("All merchandise", "/shop", products)]} />

      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "All merchandise" }]} /></div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <h1 className="display text-[clamp(2rem,4.2vw,3.25rem)]">All merchandise</h1>
        <p className="serif max-w-md text-lg leading-relaxed text-muted">Every official product from every Sparkthunder franchise, in one place.</p>
      </div>

      {/* One block per universe, in its own colour, joined by the lightning seam */}
      <ul className="-mx-(--gutter) mt-8 grid md:grid-cols-[repeat(var(--n),1fr)]" style={{ ["--n" as string]: franchises.length }} aria-label="Shop by franchise">
        {franchises.map((f) => (
          <li key={f.slug} className="md:border-l-[3px] md:border-bolt md:first:border-l-0">
            <Link href={`/franchises/${f.slug}`} style={worldStyle(f.accent)} className="world group flex h-full items-end justify-between gap-6 px-(--gutter) py-7 md:py-9">
              <span>
                <FranchiseLogo slug={f.slug} name={f.name} className="h-12 md:h-16" textClassName="display block text-[clamp(2.5rem,5vw,4.25rem)]" />
                <span className="serif mt-2 block" style={{ color: "var(--world-bright)" }}>{f.tagline}</span>
              </span>
              <span className="shrink-0 pb-1 text-right text-sm text-paper/75">{countIn((p) => p.franchiseSlug === f.slug)} products</span>
            </Link>
          </li>
        ))}
      </ul>

      <nav aria-label="Shop by type" className="mt-6">
        <ul className="flex gap-x-7 gap-y-2 overflow-x-auto whitespace-nowrap pb-1">
          <li><span aria-current="page" className="link-line font-bold">All <span className="font-normal text-muted">{products.length}</span></span></li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/categories/${c.slug}`} className="font-bold text-muted hover:text-ink hover:underline hover:underline-offset-4">
                {c.name} <span className="font-normal">{countIn((p) => p.categorySlug === c.slug)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        <Listing products={products} franchiseNames={nameBySlug} categoryNames={Object.fromEntries(categories.map((c) => [c.slug, c.name]))} priorityCount={5} flush />
      </div>
    </>
  );
}
