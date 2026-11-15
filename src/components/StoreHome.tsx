import { getT } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "@/components/LocaleLink";
import { CharacterCarousel } from "@/components/CharacterCarousel";
import type { CharacterEntry } from "@/lib/character-config";
import { homeList } from "@/lib/character-config";
import { HeroSlider } from "@/components/HeroSlider";
import { ProductCard } from "@/components/ProductCard";
import { productImagePath, isPlaceholderArt } from "@/lib/card";
import type { StoreSettings } from "@/lib/store-config";
import { DEFAULT_THEME, type HomeSectionId, type ThemeLayout } from "@/lib/theme-config";
import type { Category, Product } from "@/lib/types";

const FLUSH = "pgrid -mx-(--gutter) grid grid-cols-2 border-l border-t border-ink/15 md:grid-cols-3 xl:grid-cols-5";
const H2 = "display text-2xl sm:text-3xl";

/** The home page for any store other than the original Sparkthunder one: built entirely from the store's own settings, categories and products. */
export async function StoreHome({ store, products, categories, theme = DEFAULT_THEME, characters = [], franchiseNames = {} }: { store: StoreSettings; products: Product[]; categories: Category[]; theme?: ThemeLayout; characters?: CharacterEntry[]; franchiseNames?: Record<string, string> }) {
  const { t } = await getT();
  const featured = products.filter((p) => p.isFeatured).concat(products.filter((p) => !p.isFeatured)).slice(0, 3);
  const fresh = products.filter((p) => p.isNew).slice(0, 5);
  const picks = products.filter((p) => p.isFeatured).slice(0, 5);
  const wrap = (id: string, node: React.ReactNode) => (node ? <div key={id} className="px-(--gutter)" data-home-section={id}>{node}</div> : null);

  const sections: Record<HomeSectionId, () => React.ReactNode> = {
    hero: () => (
      <section key="hero" className="theme-dark px-(--gutter)" data-home-section="hero">
        <div className="grid min-h-[min(70vh,40rem)] items-center gap-12 pb-16 pt-14 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h1 className="display text-[clamp(2.5rem,5.2vw,4.5rem)]">{store.heroHeading}</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/75">{store.description}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/new" className="btn">{t("Shop new arrivals")}</Link>
              <Link href="/shop" className="btn btn-ink">{t("Browse everything")}</Link>
            </div>
          </div>
          {featured.length > 0 && (
            <ul className="hidden grid-cols-3 gap-3 md:grid" aria-label={t("Featured products")}>
              {featured.map((p, i) => (
                <li key={p.slug} className={i === 1 ? "mt-14" : i === 2 ? "mt-6" : ""}>
                  <Link href={`/products/${p.slug}`} className="block overflow-hidden bg-paper-2">
                    <Image src={productImagePath(p)} alt={p.name} width={900} height={1200} priority sizes="22vw" unoptimized={isPlaceholderArt(productImagePath(p))} className="aspect-[3/4] w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    ),
    // Two full-screen photos side by side, the first thing on the page. The header sits transparent on top of it (see globals.css).
    split: () => theme.split.length === 0 ? null : (
      <div key="split" data-home-section="split" data-home-split className="grid md:grid-cols-2">
        {theme.split.map((b, i) => (
          <section key={i} aria-label={b.title || b.label} className="theme-dark relative h-[80svh] overflow-hidden bg-(--store-dark) md:h-[100svh]">
            <Image src={b.image} alt="" fill priority sizes="(min-width: 768px) 50vw, 100vw" unoptimized={b.image.startsWith("https://") || b.image.endsWith(".svg")} className="object-cover object-top" />
            <div aria-hidden className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-x-0 top-[40%] px-[4.5vw] text-white">
              {b.label && <p className="text-xs font-light uppercase">{b.label}</p>}
              {i === 0 ? <h1 className="mt-1 text-2xl font-medium">{b.title}</h1> : <h2 className="mt-1 text-2xl font-medium">{b.title}</h2>}
              <div className="mt-5 flex flex-wrap gap-2">
                {b.label1 && b.href1 && <Link href={b.href1 as never} className="inline-flex h-[30px] items-center border border-white/60 bg-black/40 px-6 text-[10px] font-bold uppercase text-white backdrop-blur-sm hover:bg-white hover:text-black">{b.label1}</Link>}
                {b.label2 && b.href2 && <Link href={b.href2 as never} className="inline-flex h-[30px] items-center border border-white/60 bg-black/40 px-6 text-[10px] font-bold uppercase text-white backdrop-blur-sm hover:bg-white hover:text-black">{b.label2}</Link>}
              </div>
            </div>
          </section>
        ))}
      </div>
    ),
    slides: () => theme.slides.length === 0 ? null : (
      <div key="slides" data-home-section="slides" className="theme-dark [&>section]:mx-0">
        <HeroSlider slides={theme.slides.map((b, i) => ({
          id: `b${i}`, label: b.headline || store.name, background: "var(--store-dark)",
          children: (
            <div className="theme-dark relative -mx-(--gutter) flex min-h-[min(78vh,44rem)] items-end overflow-hidden px-(--gutter) pb-20 pt-24">
              {b.image && <Image src={b.image} alt="" fill priority={i === 0} sizes="100vw" unoptimized={b.image.startsWith("https://") || b.image.endsWith(".svg")} className="object-cover" />}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="relative max-w-3xl text-white">
                {i === 0 ? <h1 className="display text-[clamp(2.4rem,6vw,5.5rem)] uppercase leading-[0.95]">{b.headline}</h1> : <h2 className="display text-[clamp(2.4rem,6vw,5.5rem)] uppercase leading-[0.95]">{b.headline}</h2>}
                {b.text && <p className="mt-4 max-w-xl text-lg text-white/85">{b.text}</p>}
                <div className="mt-7 flex flex-wrap gap-3">
                  {b.label1 && b.href1 && <Link href={b.href1 as never} className="btn">{b.label1}</Link>}
                  {b.label2 && b.href2 && <Link href={b.href2 as never} className="btn btn-ink">{b.label2}</Link>}
                </div>
              </div>
            </div>
          ),
        }))} />
      </div>
    ),
    loyalty: () => !theme.loyalty.title ? null : wrap("loyalty", (
      <section aria-labelledby="loy-h" className="theme-dark relative mt-16 overflow-hidden bg-(--store-dark)">
        {theme.loyalty.image && <Image src={theme.loyalty.image} alt="" fill sizes="100vw" unoptimized={theme.loyalty.image.startsWith("https://") || theme.loyalty.image.endsWith(".svg")} className="object-cover opacity-40" />}
        <div className="relative grid gap-8 p-8 sm:p-12 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <h2 id="loy-h" className="display text-3xl uppercase sm:text-5xl">{theme.loyalty.title}</h2>
            {theme.loyalty.text && <p className="mt-3 max-w-xl text-ink/80">{theme.loyalty.text}</p>}
          </div>
          <div>
            {theme.loyalty.bullets.length > 0 && <ul className="space-y-2 text-ink/90">{theme.loyalty.bullets.map((b) => <li key={b} className="flex gap-3"><span aria-hidden className="mt-2 h-2 w-2 shrink-0 bg-bolt" />{b}</li>)}</ul>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={theme.loyalty.joinHref as never} className="btn">{theme.loyalty.joinLabel}</Link>
              <Link href="/account" className="btn btn-ink">{t("Sign in")}</Link>
            </div>
          </div>
        </div>
      </section>
    )),
    characters: () => {
      const list = homeList(characters);
      return list.length ? <div key="characters" className="px-(--gutter)" data-home-section="characters"><CharacterCarousel id="home-characters" title={t("Shop by character")} viewAllHref="/characters" items={list.map((c) => ({ slug: c.slug, name: c.name, image: c.image, franchise: franchiseNames[c.franchiseSlug] }))} /></div> : null;
    },
    categories: () => wrap("categories", categories.length > 0 && (
      <section aria-labelledby="types-h" className="mt-14">
        <h2 id="types-h" className={H2}>{t("Shop by category")}</h2>
        <ul className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {categories.map((c) => {
            const first = products.find((p) => p.categorySlug === c.slug);
            return (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="group relative block overflow-hidden bg-paper-2">
                  {first && <Image src={productImagePath(first)} alt="" width={600} height={750} sizes="(min-width:1280px) 20vw, 50vw" unoptimized={isPlaceholderArt(productImagePath(first))} className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 text-sm font-semibold text-white">{c.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    )),
    featured: () => wrap("featured", picks.length > 0 && (
      <section aria-labelledby="feat-h" className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="feat-h" className={H2}>{t("Featured")}</h2>
          <Link href="/shop" className="link-line text-sm font-semibold">{t("Shop all")}</Link>
        </div>
        <div className={`mt-5 ${FLUSH}`}>{picks.map((p) => <ProductCard key={p.slug} variant="flush" product={p} franchiseName="" />)}</div>
      </section>
    )),
    new: () => wrap("new", fresh.length > 0 && (
      <section aria-labelledby="new-h" className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="new-h" className={H2}>{t("New arrivals")}</h2>
          <Link href="/new" className="link-line text-sm font-semibold">{t("View all")}</Link>
        </div>
        <div className={`mt-5 ${FLUSH}`}>{fresh.map((p) => <ProductCard key={p.slug} variant="flush" product={p} franchiseName="" />)}</div>
      </section>
    )),
    story: () => wrap("story", theme.storyText && (
      <section aria-labelledby="story-h" className="mx-auto mt-16 max-w-3xl text-center">
        <h2 id="story-h" className={H2}>{theme.storyTitle || t("Our story")}</h2>
        <p className="serif mt-5 whitespace-pre-line text-lg leading-relaxed text-ink/80">{theme.storyText}</p>
      </section>
    )),
    "gift-cards": () => wrap("gift-cards", (
      <section aria-labelledby="gc-h" className="mt-16">
        <Link href="/gift-cards" className="flex flex-col gap-3 bg-paper-2 p-8 transition-colors hover:bg-ink/15 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <span><span id="gc-h" className="display block text-3xl">{t("Give them the choice")}</span><span className="mt-1 block text-muted">{t("Gift cards delivered by email in minutes.")}</span></span>
          <span className="btn self-start sm:self-center">{t("Send a gift card")}</span>
        </Link>
      </section>
    )),
  };

  return (
    <div className="-mx-(--gutter) -mb-24 pb-24">
      {theme.home.filter((x) => x.on).map((x) => sections[x.id]())}
      {products.length === 0 && <p className="mt-16 px-(--gutter) text-muted">{t("This store has no products yet. Add some in the admin and they will appear here.")}</p>}
    </div>
  );
}
