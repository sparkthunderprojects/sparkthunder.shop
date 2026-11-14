import { getT } from "@/lib/i18n/server";
import { FranchiseLogo } from "@/components/FranchiseLogo";
import Image from "next/image";
import { HeroSlider } from "@/components/HeroSlider";
import Link from "@/components/LocaleLink";
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { CharacterCarousel } from "@/components/CharacterCarousel";
import { homeList } from "@/lib/character-config";
import { getCharacters } from "@/lib/characters";
import { productImagePath, isPlaceholderArt } from "@/lib/card";
import { buildMetadata } from "@/lib/seo-metadata";
import { StoreHome } from "@/components/StoreHome";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { getStore } from "@/lib/store";
import { worldStyle } from "@/lib/theme";
import { getTheme } from "@/lib/theme.server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return buildMetadata({ title: { absolute: `${store.name} | ${store.tagline}` }, description: store.description, path: "/" });
}

/** Edge-to-edge product grid with hairline dividers. */
const FLUSH = "pgrid -mx-(--gutter) grid grid-cols-2 border-l border-t border-ink/15 md:grid-cols-3 xl:grid-cols-5";
const H2 = "display text-2xl sm:text-3xl";

const HERO_TILES = [
  { src: "/hero/black-ronin-long-sleeve.jpg", alt: "Model wearing a white long-sleeve top printed with the Black Ronin logo" },
  { src: "/hero/icon-grid-tee.jpg", alt: "Model wearing a heather blue tee printed with a colourful grid of character icons" },
  { src: "/hero/tachi-tee.jpg", alt: "Model wearing an orange tee printed with crossed swords and the word Tachi" },
] as const;

export default async function HomePage() {
  const [franchises, categories, products, store, storeId, theme, characters, { t }] = await Promise.all([getFranchises(), getCategories(), getAllProducts(), getStore(), currentStoreId(), getTheme(), getCharacters(), getT()]);
  if (storeId !== DEFAULT_STORE_ID) return <StoreHome store={store} products={products} categories={categories} theme={theme} characters={characters} franchiseNames={Object.fromEntries(franchises.map((f) => [f.slug, f.name]))} />;
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const fresh = products.filter((p) => p.isNew).slice(0, 5);
  const drop = products.find((p) => p.isNew && p.isFeatured && p.inStock) ?? products[0];
  const dropFranchise = franchises.find((f) => f.slug === drop?.franchiseSlug);

  return (
    <div className="theme-dark -mx-(--gutter) -mb-24 px-(--gutter) pb-24">
      {/* Hero slider */}
      <HeroSlider slides={[
        {
          id: "the-hexleys",
          label: "The Hexleys: not your ordinary family. New drop coming soon",
          background: "radial-gradient(70% 90% at 50% 40%, #2a1346 0%, #12081f 55%, #000 100%)",
          children: (
            <div className="mx-auto flex min-h-[min(80vh,44rem)] max-w-4xl flex-col items-center justify-center gap-6 pb-24 pt-12 text-center md:gap-8" data-hero="hexleys">
              <Image src="/hero/the-hexleys.webp" alt="The Hexleys" width={1400} height={554} sizes="(min-width:768px) 56rem, 92vw" loading="eager" priority className="h-auto w-full max-w-[min(56rem,92%)] drop-shadow-[0_10px_40px_rgba(124,58,237,0.45)]" />
              <h2 className="display text-[clamp(1.75rem,4.2vw,3.5rem)]">{t("Not Your Ordinary Family")}</h2>
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-bolt sm:text-base">{t("New Drop Coming Soon")}</p>
            </div>
          ),
        },
        {
          id: "universe",
          label: store.heroHeading,
          background: "#000",
          children: (
            <>
        <div className="grid min-h-[min(80vh,44rem)] items-center gap-12 pb-20 pt-14 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h1 className="display text-[clamp(2.5rem,5.2vw,4.5rem)]">{store.heroHeading}</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/75">{store.description}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/new" className="btn">{t("Shop new arrivals")}</Link>
              <Link href="/shop" className="btn btn-ink">{t("Browse everything")}</Link>
            </div>
          </div>
          <ul className="hidden grid-cols-3 gap-3 md:grid" aria-label={t("Featured products")}>
            {HERO_TILES.map((tile, i) => (
              <li key={tile.src} className={i === 1 ? "mt-14" : i === 2 ? "mt-6" : ""}>
                <Link href="/shop" className="block overflow-hidden bg-paper-2">
                  <Image src={tile.src} alt={t(tile.alt)} width={900} height={1200} priority sizes="22vw" className="aspect-[3/4] w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
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
              <Image src="/hero/knightverge-characters.jpg" alt={t("Ten Knightverge characters standing side by side in colour-tinted panels")} width={1600} height={880} sizes="100vw" loading="eager" className="aspect-[16/9] w-full object-cover md:absolute md:inset-0 md:h-full md:aspect-auto" />
              <div className="absolute inset-0 hidden bg-gradient-to-r from-black/90 via-black/55 to-transparent md:block" aria-hidden />
              <div className="relative px-(--gutter) pb-20 pt-8 md:flex md:min-h-[min(80vh,44rem)] md:max-w-[min(46rem,60%)] md:flex-col md:justify-center md:py-14">
                <h2 className="display text-[clamp(2.5rem,5.6vw,5rem)]">{t("Shop your Favourite Knightverge Characters")}</h2>
                <div className="mt-8"><Link href="/franchises/knightverge" className="btn">{t("Shop Knightverge")}</Link></div>
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
                <h2 className="display text-[clamp(2.75rem,6vw,5.5rem)]">{t("Shop the Merch Now!")}</h2>
                <div className="mt-8"><Link href="/franchises/occult-inc" className="btn">{t("Shop Occult Inc")}</Link></div>
              </div>
              <div className="order-1 md:order-2">
                <Image src="/franchise/jenna-hex.png" alt={t("Jenna Hex, an Occult Inc character, in white and glowing green lettering with a pentagram")} width={1100} height={803} sizes="(min-width:768px) 55vw, 100vw" loading="eager" className="mx-auto h-auto w-full max-w-3xl" />
              </div>
            </div>
          ),
        },
      ]} />

      <p className="-mx-(--gutter) grid gap-1 border-b border-ink/15 px-(--gutter) py-4 text-sm text-muted sm:grid-cols-3">
        <span>{t("Official Sparkthunder merchandise")}</span>
        <span className="sm:text-center">{t("Designed in-house by the creators")}</span>
        <span className="sm:text-right">{t("Canon-accurate to the stories")}</span>
      </p>

      {/* Universes */}
      <section aria-labelledby="u-h" className="mt-14">
        <h2 id="u-h" className={H2}>{t("Shop by universe")}</h2>
        <ul className="mt-5 grid gap-2 md:grid-cols-[repeat(var(--n),1fr)]" style={{ ["--n" as string]: franchises.length }}>
          {franchises.map((f) => (
            <li key={f.slug}>
              <Link href={`/franchises/${f.slug}`} style={worldStyle(f.accent)} className="world group relative flex min-h-[18rem] flex-col items-center justify-center gap-5 p-8 text-center transition-[filter] hover:brightness-110 md:min-h-[22rem] md:p-10">
                <FranchiseLogo slug={f.slug} name={f.name} className="h-16 max-w-[80%] !self-center !object-center md:h-24" textClassName="display text-4xl md:text-6xl" />
                <span className="max-w-sm text-sm text-white/75 md:text-base">{f.tagline}</span>
                <span className="btn btn-sm mt-1">{t("Shop {name}", { name: f.name })} <span aria-hidden>&rarr;</span></span>
                <span className="text-xs font-semibold uppercase tracking-wide text-white/60">{t("{n} products", { n: products.filter((p) => p.franchiseSlug === f.slug).length })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by character */}
      {homeList(characters).length > 0 && <CharacterCarousel id="home-characters" title={t("Shop by character")} viewAllHref="/characters" items={homeList(characters).map((c) => ({ slug: c.slug, name: c.name, image: c.image, franchise: nameBySlug[c.franchiseSlug], accent: franchises.find((f) => f.slug === c.franchiseSlug)?.accent }))} />}

      {/* New arrivals */}
      {fresh.length > 0 && (
        <section aria-labelledby="new-h" className="mt-16">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="new-h" className={H2}>{t("New arrivals")}</h2>
            <Link href="/new" className="link-line text-sm font-semibold">{t("View all")}</Link>
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
              <p className="text-sm font-semibold text-white/70">{t("Latest drop from {name}", { name: dropFranchise?.name ?? "" })}</p>
              <h2 id="drop-h" className="display text-[clamp(2.25rem,4.6vw,4rem)]">{drop.name}</h2>
              <p className="max-w-md text-lg text-white/80">{drop.shortDescription}</p>
              <div className="mt-2"><Link href={`/products/${drop.slug}`} className="btn">{t("Shop now")}</Link></div>
            </div>
            <div className="-mr-(--gutter)">
              <Image src={productImagePath(drop)} alt={t("{name} - official Sparkthunder merchandise", { name: drop.name })} width={1200} height={1200} sizes="50vw" unoptimized={isPlaceholderArt(productImagePath(drop))} className="aspect-[4/3] w-full object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* Shop by type */}
      <section aria-labelledby="types-h" className="mt-16">
        <h2 id="types-h" className={H2}>{t("Shop by type")}</h2>
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
              <h2 id={`f-${f.slug}`} className={H2}>{t("From {name}", { name: f.name })}</h2>
              <Link href={`/franchises/${f.slug}`} className="link-line text-sm font-semibold">{t("Shop all {name}", { name: f.name })}</Link>
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
          <h2 id="gifts-h" className={H2}>{t("Gifts for every budget")}</h2>
          <Link href="/gifts" className="link-line text-sm font-semibold">{t("All gifts")}</Link>
        </div>
        <ul className="mt-5 grid gap-2 md:grid-cols-3">
          {[["under-15", "Under £15"], ["15-to-25", "£15 to £25"], ["25-to-50", "£25 to £50"]].map(([id, label]) => (
            <li key={id}>
              <Link href={`/gifts#${id}`} className="display block bg-paper-2 p-8 text-3xl transition-colors hover:bg-ink/15 sm:p-10">{t(label)}</Link>
            </li>
          ))}
        </ul>
        <Link href="/gift-cards" className="group mt-2 flex flex-col gap-4 bg-[#ffd400] p-8 text-black transition-colors hover:bg-[#ffe14d] sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <span>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-black/70">{t("New")}</span>
            <span className="display mt-2 block text-3xl sm:text-4xl">{t("Give them the choice: Sparkthunder gift cards")}</span>
            <span className="mt-2 block max-w-xl text-black/75">{t("Delivered by email in minutes, from £5 to £250. Add a message and pick a Knightverge or Occult Inc design.")}</span>
          </span>
          <span className="shrink-0 self-start bg-black px-6 py-3 font-bold text-white sm:self-center">{t("Send a gift card")}</span>
        </Link>
      </section>
    </div>
  );
}
