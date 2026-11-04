import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { worldStyle } from "@/lib/theme";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} | Official Knightverge, Grim Gala & Sparkthunder Merchandise`,
  description: "Shop official Sparkthunder merchandise: apparel, collectibles, drinkware, posters and tabletop gear from Knightverge, Grim Gala and more.",
  path: "/",
});

const SEAM_V = "18,0 0,16 14,32 2,50 18,68 0,84 12,100";
const SEAM_H = "0,18 12,0 24,14 38,2 52,18 66,0 80,14 100,4";

export default async function HomePage() {
  const [franchises, categories, products] = await Promise.all([getFranchises(), getCategories(), getAllProducts()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const featured = products.filter((p) => p.isFeatured).slice(0, 8);
  const fresh = products.filter((p) => p.isNew).slice(0, 4);

  return (
    <div>
      {/* Hero: pick a universe */}
      <section aria-label="Shop by franchise" className="hero" style={{ ["--n" as string]: franchises.length }}>
        {franchises.map((f, i) => {
          const count = products.filter((p) => p.franchiseSlug === f.slug).length;
          return (
            <div key={f.slug} className="panel text-[#f4f2f8]" style={worldStyle(f.accent)}>
              <div className="panel-bg world" aria-hidden />
              {i > 0 && (
                <>
                  <svg className="seam seam-v" viewBox="0 0 18 100" preserveAspectRatio="none" aria-hidden><polyline points={SEAM_V} /></svg>
                  <svg className="seam seam-h" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden><polyline points={SEAM_H} /></svg>
                </>
              )}
              <div className="panel-body">
                <h2 className="display text-[clamp(4.25rem,10vw,9rem)]">{f.name}</h2>
                <p className="serif max-w-md text-xl italic leading-snug" style={{ color: "var(--world-bright)" }}>{f.tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link href={`/franchises/${f.slug}`} className="btn">Shop {f.name}</Link>
                  <span className="text-sm text-paper/70">{count} {count === 1 ? "product" : "products"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* What this is */}
      <section className="mt-20 grid gap-8 md:grid-cols-[1.6fr_1fr] md:items-end">
        <h1 className="display text-[clamp(3rem,6vw,5.25rem)]">Official merchandise from every Sparkthunder universe</h1>
        <p className="prose-lore text-muted">{SITE.description}</p>
      </section>

      {/* Shop by type */}
      <section aria-labelledby="types-h" className="mt-24">
        <h2 id="types-h" className="display text-5xl">Shop by type</h2>
        <ul className="mt-8 border-b-2 border-ink">
          {categories.map((c) => {
            const n = products.filter((p) => p.categorySlug === c.slug).length;
            return (
              <li key={c.slug} className="border-t-2 border-ink">
                <Link href={`/categories/${c.slug}`} className="group flex items-baseline justify-between gap-6 py-5 transition-colors hover:bg-ink hover:text-paper sm:px-4">
                  <span className="display text-4xl sm:text-5xl">{c.name}</span>
                  <span className="text-muted group-hover:text-bolt">{n} {n === 1 ? "item" : "items"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="featured-h" className="mt-24">
        <h2 id="featured-h" className="display text-5xl">Featured</h2>
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {featured.map((p, i) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} priority={i < 4} />)}
        </div>
      </section>

      {fresh.length > 0 && (
        <section aria-labelledby="new-h" className="mt-24">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="new-h" className="display text-5xl">New arrivals</h2>
            <Link href="/new" className="link-line font-bold">See all new arrivals</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {fresh.map((p) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
          </div>
        </section>
      )}
    </div>
  );
}
