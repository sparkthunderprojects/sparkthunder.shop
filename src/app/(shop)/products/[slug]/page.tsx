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
import { getAllProducts, getCategory, getFranchise, getFranchises, getProduct, getRelatedProducts } from "@/lib/catalog";
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

  const [franchise, category, related, franchises, allProducts] = await Promise.all([
    getFranchise(product.franchiseSlug),
    getCategory(product.categorySlug),
    getRelatedProducts(product),
    getFranchises(),
    getAllProducts(),
  ]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const path = `/products/${product.slug}`;
  const cartItem = { slug: product.slug, name: product.name, pricePence: product.pricePence, image: productImagePath(product) };
  const gallery = product.images.length ? product.images : [productImagePath(product)];

  return (
    <div style={worldStyle(franchise?.accent)}>
      <JsonLd data={[
        productLd(product, franchise, category),
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
          <p className="mt-1 text-sm text-muted">{product.inStock ? "In stock" : "Currently sold out"} · SKU {product.sku}</p>

          <div id="buy-box" className="mt-8"><BuyBox product={toQuick(product, franchise?.name)} /></div>
          <p className="mt-4"><ShareButton title={product.name} path={path} /></p>

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
      <StickyBuyBar targetId="buy-box" item={cartItem} inStock={product.inStock} hasOptions={(product.variants ?? []).length > 0} />

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
