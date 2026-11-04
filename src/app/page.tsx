import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { worldStyle } from "@/lib/theme";
import { GRID, nb } from "@/lib/ui";

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
  const fresh = [...products].filter((p) => p.isNew).slice(0, 6);
  const drop = products.find((p) => p.isNew && p.isFeatured && p.inStock) ?? products[0];
  const dropFranchise = franchises.find((f) => f.slug === drop?.franchiseSlug);

  return (
    <div>
      {/* 1. Pick a universe */}
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
                <h2 className="display text-[clamp(4.25rem,11vw,10rem)]">{f.name}</h2>
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

      {/* 2. Trust strip: only things that are true */}
      <section aria-label="Why shop here" className="bleed grid gap-x-8 gap-y-2 border-b-2 border-ink py-4 text-sm font-bold sm:grid-cols-3">
        <p>Official Sparkthunder merchandise</p>
        <p className="sm:text-center">Designed in-house by the creators</p>
        <p className="sm:text-right">Canon-accurate to the stories</p>
      </section>

      {/* 3. H1 + intro */}
      <section className="mt-16 grid gap-8 md:grid-cols-[1.6fr_1fr] md:items-end">
        <h1 className="display text-[clamp(3rem,6.2vw,6.5rem)]">Official merchandise from every Sparkthunder universe</h1>
        <p className="prose-lore text-muted">{SITE.description}</p>
      </section>

      {/* 4. New arrivals */}
      {fresh.length > 0 && (
        <section aria-labelledby="new-h" className="mt-24">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="new-h" className="display text-5xl sm:text-6xl">New arrivals</h2>
            <Link href="/new" className="link-line font-bold">View all new arrivals</Link>
          </div>
          <div className={`mt-8 ${GRID}`}>
            {fresh.map((p, i) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} priority={i < 6} />)}
          </div>
        </section>
      )}

      {/* 5. Latest drop: a full-bleed feature in the product's own franchise colours */}
      {drop && (
        <section aria-labelledby="drop-h" className="world bleed mt-24 py-0" style={worldStyle(dropFranchise?.accent)}>
          <div className="grid items-stretch md:grid-cols-2">
            <div className="flex flex-col justify-center gap-5 py-14 pr-0 md:pr-12">
              <p className="font-bold" style={{ color: "var(--world-bright)" }}>Latest drop · {dropFranchise?.name}</p>
              <h2 id="drop-h" className="display text-[clamp(3.25rem,7vw,7rem)]">{nb(drop.name)}</h2>
              <p className="serif max-w-md text-xl text-paper/85">{drop.shortDescription}</p>
              <div><Link href={`/products/${drop.slug}`} className="btn">Shop {drop.name}</Link></div>
            </div>
            <div className="-mr-(--gutter) -mb-px">
              <Image src={drop.images[0] ?? `/art/${drop.slug}`} alt={`${drop.name} - official Sparkthunder merchandise`} width={1200} height={1200} sizes="50vw" unoptimized={!drop.images[0]} className="h-full max-h-[44rem] w-full object-cover object-bottom" />
            </div>
          </div>
        </section>
      )}

      {/* 6. Shop by type: image tiles */}
      <section aria-labelledby="types-h" className="mt-24">
        <h2 id="types-h" className="display text-5xl sm:text-6xl">Shop by type</h2>
        <ul className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {categories.map((c) => {
            const first = products.find((p) => p.categorySlug === c.slug);
            return (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="group relative block border-2 border-ink bg-paper-2">
                  {first && <Image src={first.images[0] ?? `/art/${first.slug}`} alt="" width={600} height={600} sizes="(min-width:1280px) 20vw, 50vw" unoptimized={!first.images[0]} className="aspect-[4/5] w-full object-cover" />}
                  <span className="display absolute inset-x-0 bottom-0 bg-ink px-4 py-3 text-3xl text-paper group-hover:bg-bolt group-hover:text-ink">{c.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 7. A shelf per franchise */}
      {franchises.map((f) => {
        const mine = products.filter((p) => p.franchiseSlug === f.slug).slice(0, 6);
        if (mine.length === 0) return null;
        return (
          <section key={f.slug} aria-labelledby={`f-${f.slug}`} className="mt-24" style={worldStyle(f.accent)}>
            <div className="flex items-baseline justify-between gap-4 border-b-4 pb-3" style={{ borderColor: "var(--color-world)" }}>
              <h2 id={`f-${f.slug}`} className="display text-5xl sm:text-6xl">From {f.name}</h2>
              <Link href={`/franchises/${f.slug}`} className="link-line font-bold">Shop all {f.name}</Link>
            </div>
            <div className={`mt-8 ${GRID}`}>
              {mine.map((p) => <ProductCard key={p.slug} product={p} franchiseName={f.name} />)}
            </div>
          </section>
        );
      })}

      {/* 8. Gifts by price */}
      <section aria-labelledby="gifts-h" className="mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="gifts-h" className="display text-5xl sm:text-6xl">Gifts for every budget</h2>
          <Link href="/gifts" className="link-line font-bold">All gifts</Link>
        </div>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {[["under-15", "Under £15"], ["15-to-25", "£15 to £25"], ["25-to-50", "£25 to £50"]].map(([id, label]) => (
            <li key={id}>
              <Link href={`/gifts#${id}`} className="display block bg-ink p-8 text-5xl text-paper hover:bg-bolt hover:text-ink sm:p-12 sm:text-6xl">{label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
