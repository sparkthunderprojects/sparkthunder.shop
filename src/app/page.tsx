import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { productImagePath, isPlaceholderArt } from "@/lib/card";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { worldStyle } from "@/lib/theme";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} | Official Knightverge, Grim Gala & Sparkthunder Merchandise`,
  description: "Shop official Sparkthunder merchandise: apparel, collectibles, drinkware, posters and tabletop gear from Knightverge, Grim Gala and more.",
  path: "/",
});

/** Edge-to-edge product grid with hairline dividers. */
const FLUSH = "-mx-(--gutter) grid grid-cols-2 border-l border-t border-ink/15 md:grid-cols-3 xl:grid-cols-5";
const H2 = "display text-2xl sm:text-3xl";

export default async function HomePage() {
  const [franchises, categories, products] = await Promise.all([getFranchises(), getCategories(), getAllProducts()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const fresh = products.filter((p) => p.isNew).slice(0, 5);
  const heroPicks = [...products].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 3);
  const drop = products.find((p) => p.isNew && p.isFeatured && p.inStock) ?? products[0];
  const dropFranchise = franchises.find((f) => f.slug === drop?.franchiseSlug);
  const [a, b] = franchises;
  const heroBg = `linear-gradient(110deg, color-mix(in oklab, ${a?.accent ?? "#222"} 34%, #000) 0%, #000 58%, color-mix(in oklab, ${(b ?? a)?.accent ?? "#222"} 30%, #000) 100%)`;

  return (
    <div className="theme-dark -mx-(--gutter) -mb-24 px-(--gutter) pb-24">
      {/* Hero */}
      <section aria-label="Featured" className="-mx-(--gutter) px-(--gutter)" style={{ background: heroBg }}>
        <div className="grid min-h-[min(80vh,44rem)] items-center gap-12 py-14 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h1 className="display text-[clamp(2.5rem,5.2vw,4.5rem)]">Official merchandise from every Sparkthunder universe</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/75">{SITE.description}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/new" className="btn">Shop new arrivals</Link>
              <Link href="/shop" className="btn btn-ink">Browse everything</Link>
            </div>
          </div>
          <ul className="hidden grid-cols-3 gap-3 md:grid" aria-label="Featured products">
            {heroPicks.map((p, i) => (
              <li key={p.slug} className={i === 1 ? "mt-14" : i === 2 ? "mt-6" : ""}>
                <Link href={`/products/${p.slug}`} aria-label={p.name} className="block">
                  <Image src={productImagePath(p)} alt="" width={600} height={750} priority sizes="22vw" unoptimized={isPlaceholderArt(productImagePath(p))} className="aspect-[3/4] w-full object-cover" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="-mx-(--gutter) grid gap-1 border-b border-ink/15 px-(--gutter) py-4 text-sm text-muted sm:grid-cols-3">
        <span>Official Sparkthunder merchandise</span>
        <span className="sm:text-center">Designed in-house by the creators</span>
        <span className="sm:text-right">Canon-accurate to the stories</span>
      </p>

      {/* Universes */}
      <section aria-labelledby="u-h" className="mt-14">
        <h2 id="u-h" className={H2}>Shop by universe</h2>
        <ul className="mt-5 grid gap-2 md:grid-cols-[repeat(var(--n),1fr)]" style={{ ["--n" as string]: franchises.length }}>
          {franchises.map((f) => (
            <li key={f.slug}>
              <Link href={`/franchises/${f.slug}`} style={worldStyle(f.accent)} className="world group relative flex aspect-[16/7] flex-col justify-end p-6 transition-[filter] hover:brightness-125 md:p-8">
                <span className="display text-4xl md:text-5xl">{f.name}</span>
                <span className="mt-2 max-w-sm text-sm text-white/70">{f.tagline}</span>
                <span className="mt-4 text-sm font-semibold">{products.filter((p) => p.franchiseSlug === f.slug).length} products</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* New arrivals */}
      {fresh.length > 0 && (
        <section aria-labelledby="new-h" className="mt-16">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="new-h" className={H2}>New arrivals</h2>
            <Link href="/new" className="link-line text-sm font-semibold">View all</Link>
          </div>
          <div className={`mt-5 ${FLUSH}`}>
            {fresh.map((p) => <ProductCard key={p.slug} variant="flush" product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
          </div>
        </section>
      )}

      {/* Latest drop */}
      {drop && (
        <section aria-labelledby="drop-h" className="world -mx-(--gutter) mt-16 px-(--gutter)" style={worldStyle(dropFranchise?.accent)}>
          <div className="grid items-center md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4 py-12 md:pr-12">
              <p className="text-sm font-semibold text-white/70">Latest drop from {dropFranchise?.name}</p>
              <h2 id="drop-h" className="display text-[clamp(2.25rem,4.6vw,4rem)]">{drop.name}</h2>
              <p className="max-w-md text-lg text-white/80">{drop.shortDescription}</p>
              <div className="mt-2"><Link href={`/products/${drop.slug}`} className="btn">Shop now</Link></div>
            </div>
            <div className="-mr-(--gutter)">
              <Image src={productImagePath(drop)} alt={`${drop.name} - official Sparkthunder merchandise`} width={1200} height={1200} sizes="50vw" unoptimized={isPlaceholderArt(productImagePath(drop))} className="aspect-[4/3] w-full object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* Shop by type */}
      <section aria-labelledby="types-h" className="mt-16">
        <h2 id="types-h" className={H2}>Shop by type</h2>
        <ul className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {categories.map((c) => {
            const first = products.find((p) => p.categorySlug === c.slug);
            return (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="group relative block overflow-hidden bg-paper-2">
                  {first && <Image src={productImagePath(first)} alt="" width={600} height={750} sizes="(min-width:1280px) 20vw, 50vw" unoptimized={isPlaceholderArt(productImagePath(first))} className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 text-sm font-semibold text-white">{c.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* A shelf per franchise */}
      {franchises.map((f) => {
        const mine = products.filter((p) => p.franchiseSlug === f.slug).slice(0, 5);
        if (mine.length === 0) return null;
        return (
          <section key={f.slug} aria-labelledby={`f-${f.slug}`} className="mt-16">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id={`f-${f.slug}`} className={H2}>From {f.name}</h2>
              <Link href={`/franchises/${f.slug}`} className="link-line text-sm font-semibold">Shop all {f.name}</Link>
            </div>
            <div className={`mt-5 ${FLUSH}`}>
              {mine.map((p) => <ProductCard key={p.slug} variant="flush" product={p} franchiseName={f.name} />)}
            </div>
          </section>
        );
      })}

      {/* Gifts */}
      <section aria-labelledby="gifts-h" className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="gifts-h" className={H2}>Gifts for every budget</h2>
          <Link href="/gifts" className="link-line text-sm font-semibold">All gifts</Link>
        </div>
        <ul className="mt-5 grid gap-2 md:grid-cols-3">
          {[["under-15", "Under £15"], ["15-to-25", "£15 to £25"], ["25-to-50", "£25 to £50"]].map(([id, label]) => (
            <li key={id}>
              <Link href={`/gifts#${id}`} className="display block bg-paper-2 p-8 text-3xl transition-colors hover:bg-ink/15 sm:p-10">{label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
