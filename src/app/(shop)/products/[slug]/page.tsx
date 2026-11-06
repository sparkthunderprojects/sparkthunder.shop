import { productSeo } from "@/lib/seo/effective";
import { GRID, nb } from "@/lib/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BuyBox } from "@/components/BuyBox";
import { toQuick } from "@/lib/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { RecentTracker, RecentlyViewed } from "@/components/Recent";
import { ShareButton } from "@/components/ShareButton";
import { StickyBuyBar } from "@/components/StickyBuyBar";
import { productImagePath } from "@/lib/card";
import { getAllProducts, getCategory, getCompleteTheSet, getFranchise, getFranchises, getProduct, getRelatedProducts } from "@/lib/catalog";
import { characterName, characterSlugs } from "@/lib/characters";
import { FrequentlyBought } from "@/components/FrequentlyBought";
import { getSalesStats } from "@/lib/sales";
import { isUpcoming } from "@/lib/launch";
import { QuestionsSection } from "@/components/QuestionsSection";
import { getQuestions } from "@/lib/questions";
import { ReviewsSection } from "@/components/ReviewsSection";
import { getReviews } from "@/lib/reviews";
import { breadcrumbLd, buildMetadata, clip, productImageUrl, productLd } from "@/lib/seo";
import { formatPrice } from "@/lib/site";
import { worldStyle } from "@/lib/theme";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getAllProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const f = await getFranchise(p.franchiseSlug);
  const seo = productSeo(p, f);
  return buildMetadata({ title: seo.title, description: seo.description, path: seo.path, image: seo.image, noindex: seo.noindex, canonical: seo.canonical });
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [franchise, category, relatedAll, completeSet, franchises, allProducts, reviews, questions] = await Promise.all([
    getFranchise(product.franchiseSlug),
    getCategory(product.categorySlug),
    getRelatedProducts(product, 8),
    getCompleteTheSet(product),
    getFranchises(),
    getAllProducts(),
    getReviews(slug),
    getQuestions(slug),
  ]);
  const stats = await getSalesStats();
  const partners = (stats.together[product.slug] ?? [])
    .map((s) => allProducts.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x) && x!.inStock && !(x!.variants ?? []).length && !isUpcoming(x!.launchAt) && !x!.bundleItems?.length)
    .slice(0, 2)
    .map((x) => ({ slug: x.slug, name: x.name, pricePence: x.pricePence, image: productImagePath(x) }));
  const canGroup = partners.length > 0 && product.inStock && !(product.variants ?? []).length && !isUpcoming(product.launchAt) && !product.bundleItems?.length;
  const inSet = new Set(completeSet.map((p) => p.slug));
  const related = relatedAll.filter((p) => !inSet.has(p.slug)).slice(0, 4);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const total = product.trackStock ? (product.variants?.length ? product.variants.reduce((n, v) => n + v.stockQty, 0) : product.stockQty ?? 0) : null;
  const lowCount = product.inStock && total !== null && total > 0 && total <= (product.lowStockThreshold ?? 3) ? total : null;
  const bundleParts = (product.bundleItems ?? []).flatMap((b) => { const part = allProducts.find((x) => x.slug === b.slug); return part ? [{ part, qty: b.qty }] : []; });
  const separatePence = bundleParts.reduce((n, b) => n + b.part.pricePence * b.qty, 0);
  const bundleSaving = bundleParts.length ? separatePence - product.pricePence : 0;
  const path = `/products/${product.slug}`;
  const cartItem = { slug: product.slug, name: product.name, pricePence: product.pricePence, image: productImagePath(product) };
  const gallery = product.images.length ? product.images : [productImagePath(product)];

  return (
    <div style={worldStyle(franchise?.accent)}>
      <JsonLd data={[
        productLd(product, franchise, category, reviews),
        ...(questions.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions.slice(0, 10).map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })) }] : []),
        breadcrumbLd([
          { name: "Home", path: "/" },
          ...(franchise ? [{ name: franchise.name, path: `/franchises/${franchise.slug}` }] : []),
          ...(category ? [{ name: category.name, path: `/categories/${category.slug}` }] : []),
          { name: product.name, path },
        ]),
      ]} />
      <div className="pt-8">
        <Breadcrumbs items={[
          { name: "Home", href: "/" },
          ...(franchise ? [{ name: franchise.name, href: `/franchises/${franchise.slug}` }] : []),
          ...(category ? [{ name: category.name, href: `/categories/${category.slug}` }] : []),
          { name: product.name },
        ]} />
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <ProductGallery images={gallery} alts={product.imageAlts} name={product.name} sizes="(min-width:1024px) 55vw, 100vw" />

        <div className="lg:pt-2">
          {franchise && (
            <Link href={`/franchises/${franchise.slug}`} className="inline-flex items-center gap-2 font-bold hover:underline hover:underline-offset-4">
              <span className="inline-block h-3 w-3" style={{ background: "var(--color-world)" }} aria-hidden />
              {franchise.name}
            </Link>
          )}
          <h1 className="display mt-3 text-[clamp(2rem,3.4vw,2.75rem)]">{nb(product.name)}</h1>
          <p className="mt-6 flex items-baseline gap-3">
            <span className="display text-3xl">{formatPrice(product.pricePence)}</span>
            {product.comparePricePence && <s className="text-lg text-muted">{formatPrice(product.comparePricePence)}</s>}
          </p>
          <p className="mt-1 text-sm text-muted">
            {product.bestSeller ? <b className="mr-2 bg-bolt px-2 py-0.5 text-(--color-on-accent)">Best seller</b> : null}{!product.inStock ? "Currently sold out" : lowCount !== null ? <b className="text-amber-600">Only {lowCount} left</b> : "In stock"} · SKU {product.sku}
          </p>
          {characterSlugs(product).length > 0 && (
            <p className="mt-2 text-sm">Featuring {characterSlugs(product).map((c, i) => <span key={c}>{i > 0 ? ", " : ""}<Link href={`/characters/${c}`} className="font-bold underline underline-offset-4">{characterName(c)}</Link></span>)}</p>
          )}

          <div id="buy-box" className="mt-8"><BuyBox product={toQuick(product, franchise?.name)} /></div>
          <p className="mt-4"><ShareButton title={product.name} path={path} /></p>

          {bundleParts.length > 0 && (
            <section className="mt-10 border border-ink/20 bg-paper-2 p-5" aria-labelledby="bundle-h">
              <h2 id="bundle-h" className="display text-3xl">What&apos;s in the bundle</h2>
              {bundleSaving > 0 && <p className="mt-1 font-bold">Buying these separately costs {formatPrice(separatePence)}. Save {formatPrice(bundleSaving)}.</p>}
              <ul className="mt-4 divide-y divide-ink/15">
                {bundleParts.map(({ part, qty }) => (
                  <li key={part.slug}>
                    <Link href={`/products/${part.slug}`} className="flex items-center gap-4 py-3 hover:underline hover:underline-offset-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={productImagePath(part)} alt="" width={56} height={56} className="h-14 w-14 border border-ink/20 object-cover" />
                      <span className="flex-1 font-bold">{part.name}{qty > 1 ? ` × ${qty}` : ""}</span>
                      <span className="text-muted">{formatPrice(part.pricePence * qty)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="prose-lore mt-10">{product.description}</p>

          {product.details.length > 0 && (
            <section className="mt-10" aria-labelledby="details-h">
              <h2 id="details-h" className="display text-3xl">Product details</h2>
              <ul className="mt-4 border-b border-ink/25">
                {product.details.map((d) => <li key={d} className="border-t border-ink/25 py-2.5">{d}</li>)}
              </ul>
            </section>
          )}
        </div>
      </div>

      <RecentTracker slug={product.slug} />
      <StickyBuyBar targetId="buy-box" item={cartItem} inStock={product.inStock} hasOptions={(product.variants ?? []).length > 0} launchAt={product.launchAt} />

      {canGroup ? <FrequentlyBought main={{ slug: product.slug, name: product.name, pricePence: product.pricePence, image: productImagePath(product) }} partners={partners} /> : null}

      <ReviewsSection slug={product.slug} summary={reviews} />

      <QuestionsSection slug={product.slug} questions={questions} />

      {completeSet.length > 0 && (
        <section className="mt-24" aria-labelledby="set-h">
          <h2 id="set-h" className="display text-2xl sm:text-3xl">Complete the set</h2>
          <p className="mt-2 text-muted">More official {franchise?.name ?? ""} merch to go with it.</p>
          <div className={`mt-8 ${GRID}`}>
            {completeSet.map((p) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related-h">
          <h2 id="related-h" className="display text-2xl sm:text-3xl">More from the universe</h2>
          <div className={`mt-8 ${GRID}`}>
            {related.map((p) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
          </div>
        </section>
      )}
      <RecentlyViewed products={allProducts} franchiseNames={nameBySlug} excludeSlug={product.slug} />
    </div>
  );
}
