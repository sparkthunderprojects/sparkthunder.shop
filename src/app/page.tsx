import { FranchiseLogo } from "@/components/FranchiseLogo";
import Image from "next/image";
import { HeroSlider } from "@/components/HeroSlider";
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
  title: `${SITE.name} | Official Knightverge, Occult Inc & Sparkthunder Merchandise`,
  description: "Shop official Sparkthunder merchandise: apparel, collectibles, drinkware, posters and tabletop gear from Knightverge, Occult Inc and more.",
  path: "/",
});

/** Edge-to-edge product grid with hairline dividers. */
const FLUSH = "-mx-(--gutter) grid grid-cols-2 border-l border-t border-ink/15 md:grid-cols-3 xl:grid-cols-5";
const H2 = "display text-2xl sm:text-3xl";

const HERO_TILES = [
  { src: "/hero/black-ronin-long-sleeve.jpg", alt: "Model wearing a white long-sleeve top printed with the Black Ronin logo" },
  { src: "/hero/icon-grid-tee.jpg", alt: "Model wearing a heather blue tee printed with a colourful grid of character icons" },
  { src: "/hero/tachi-tee.jpg", alt: "Model wearing an orange tee printed with crossed swords and the word Tachi" },
] as const;

export default async function HomePage() {
  const [franchises, categories, products] = await Promise.all([getFranchises(), getCategories(), getAllProducts()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const fresh = products.filter((p) => p.isNew).slice(0, 5);
  const drop = products.find((p) => p.isNew && p.isFeatured && p.inStock) ?? products[0];
  const dropFranchise = franchises.find((f) => f.slug === drop?.franchiseSlug);

  return (
    <div className="theme-dark -mx-(--gutter) -mb-24 px-(--gutter) pb-24">
      {/* Hero slider */}
      <HeroSlider slides={[
        {
          id: "universe",
          label: "Official merchandise from every Sparkthunder universe",
          background: "#000",
          children: (
            <>
        <div className="grid min-h-[min(80vh,44rem)] items-center gap-12 pb-20 pt-14 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h1 className="display text-[clamp(2.5rem,5.2vw,4.5rem)]">Official merchandise from every Sparkthunder universe</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/75">{SITE.description}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/new" className="btn">Shop new arrivals</Link>
              <Link href="/shop" className="btn btn-ink">Browse everything</Link>
            </div>
          </div>
          <ul className="hidden grid-cols-3 gap-3 md:grid" aria-label="Featured products">
            {HERO_TILES.map((t, i) => (
              <li key={t.src} className={i === 1 ? "mt-14" : i === 2 ? "mt-6" : ""}>
                <Link href="/shop" className="block overflow-hidden bg-paper-2">
                  <Image src={t.src} alt={t.alt} width={900} height={1200} priority sizes="22vw" className="aspect-[3/4] w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
            </>
          ),
        },
        {
          id: "knightverge-characters",
          label: "Shop your favourite Knightverge characters",
          background: "#0a0b16",
          children: (
            <div className="-mx-(--gutter) md:relative md:min-h-[min(80vh,44rem)]">
              <Image src="/hero/knightverge-characters.jpg" alt="Ten Knightverge characters standing side by side in colour-tinted panels" width={1600} height={880} sizes="100vw" loading="eager" className="aspect-[16/9] w-full object-cover md:absolute md:inset-0 md:h-full md:aspect-auto" />
              <div className="absolute inset-0 hidden bg-gradient-to-r from-black/90 via-black/55 to-transparent md:block" aria-hidden />
              <div className="relative px-(--gutter) pb-20 pt-8 md:flex md:min-h-[min(80vh,44rem)] md:max-w-[min(46rem,60%)] md:flex-col md:justify-center md:py-14">
                <h2 className="display text-[clamp(2.5rem,5.6vw,5rem)]">Shop your Favourite Knightverge Characters</h2>
                <div className="mt-8"><Link href="/franchises/knightverge" className="btn">Shop Knightverge</Link></div>
              </div>
            </div>
          ),
        },
        {
          id: "jenna-hex",
          label: "Shop the Merch Now",
          background: "radial-gradient(60% 80% at 70% 50%, #0f2a12 0%, #050a05 55%, #000 100%)",
          children: (
            <div className="grid min-h-[min(80vh,44rem)] items-center gap-6 pb-20 pt-10 md:grid-cols-[0.85fr_1.15fr] md:gap-12 md:py-14">
              <div className="order-2 md:order-1">
                <h2 className="display text-[clamp(2.75rem,6vw,5.5rem)]">Shop the Merch Now!</h2>
                <div className="mt-8"><Link href="/franchises/occult-inc" className="btn">Shop Occult Inc</Link></div>
              </div>
              <div className="order-1 md:order-2">
                <Image src="/franchise/jenna-hex.png" alt="Jenna Hex, an Occult Inc character, in white and glowing green lettering with a pentagram" width={1100} height={803} sizes="(min-width:768px) 55vw, 100vw" loading="eager" className="mx-auto h-auto w-full max-w-3xl" />
              </div>
            </div>
          ),
        },
      ]} />

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
                <FranchiseLogo slug={f.slug} name={f.name} className="h-14 md:h-20" textClassName="display text-4xl md:text-5xl" />
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
