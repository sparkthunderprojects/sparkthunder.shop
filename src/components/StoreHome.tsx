import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { productImagePath, isPlaceholderArt } from "@/lib/card";
import type { StoreSettings } from "@/lib/store-config";
import { DEFAULT_THEME, type HomeSectionId, type ThemeLayout } from "@/lib/theme-config";
import type { Category, Product } from "@/lib/types";

const FLUSH = "pgrid -mx-(--gutter) grid grid-cols-2 border-l border-t border-ink/15 md:grid-cols-3 xl:grid-cols-5";
const H2 = "display text-2xl sm:text-3xl";

/** The home page for any store other than the original Sparkthunder one: built entirely from the store's own settings, categories and products. */
export function StoreHome({ store, products, categories, theme = DEFAULT_THEME }: { store: StoreSettings; products: Product[]; categories: Category[]; theme?: ThemeLayout }) {
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
              <Link href="/new" className="btn">Shop new arrivals</Link>
              <Link href="/shop" className="btn btn-ink">Browse everything</Link>
            </div>
          </div>
          {featured.length > 0 && (
            <ul className="hidden grid-cols-3 gap-3 md:grid" aria-label="Featured products">
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
    categories: () => wrap("categories", categories.length > 0 && (
      <section aria-labelledby="types-h" className="mt-14">
        <h2 id="types-h" className={H2}>Shop by category</h2>
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
          <h2 id="feat-h" className={H2}>Featured</h2>
          <Link href="/shop" className="link-line text-sm font-semibold">Shop all</Link>
        </div>
        <div className={`mt-5 ${FLUSH}`}>{picks.map((p) => <ProductCard key={p.slug} variant="flush" product={p} franchiseName="" />)}</div>
      </section>
    )),
    new: () => wrap("new", fresh.length > 0 && (
      <section aria-labelledby="new-h" className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="new-h" className={H2}>New arrivals</h2>
          <Link href="/new" className="link-line text-sm font-semibold">View all</Link>
        </div>
        <div className={`mt-5 ${FLUSH}`}>{fresh.map((p) => <ProductCard key={p.slug} variant="flush" product={p} franchiseName="" />)}</div>
      </section>
    )),
    story: () => wrap("story", theme.storyText && (
      <section aria-labelledby="story-h" className="mx-auto mt-16 max-w-3xl text-center">
        <h2 id="story-h" className={H2}>{theme.storyTitle || "Our story"}</h2>
        <p className="serif mt-5 whitespace-pre-line text-lg leading-relaxed text-ink/80">{theme.storyText}</p>
      </section>
    )),
    "gift-cards": () => wrap("gift-cards", (
      <section aria-labelledby="gc-h" className="mt-16">
        <Link href="/gift-cards" className="flex flex-col gap-3 bg-paper-2 p-8 transition-colors hover:bg-ink/15 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <span><span id="gc-h" className="display block text-3xl">Give them the choice</span><span className="mt-1 block text-muted">Gift cards delivered by email in minutes.</span></span>
          <span className="btn self-start sm:self-center">Send a gift card</span>
        </Link>
      </section>
    )),
  };

  return (
    <div className="-mx-(--gutter) -mb-24 pb-24">
      {theme.home.filter((x) => x.on).map((x) => sections[x.id]())}
      {products.length === 0 && <p className="mt-16 px-(--gutter) text-muted">This store has no products yet. Add some in the admin and they will appear here.</p>}
    </div>
  );
}
