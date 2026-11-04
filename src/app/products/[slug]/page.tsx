import { GRID, nb } from "@/lib/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AddToCart } from "@/components/AddToCart";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
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
  return buildMetadata({
    title: `${p.name}${f ? ` - ${f.name}` : ""} | ${formatPrice(p.pricePence)}`,
    description: clip(`${p.shortDescription} ${p.description}`),
    path: `/products/${p.slug}`,
    image: productImageUrl(p),
  });
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [franchise, category, related, franchises] = await Promise.all([
    getFranchise(product.franchiseSlug),
    getCategory(product.categorySlug),
    getRelatedProducts(product),
    getFranchises(),
  ]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const path = `/products/${product.slug}`;

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
        <div className="self-start border-2 border-ink bg-paper-2">
          <ProductImage product={product} priority sizes="(min-width:1024px) 55vw, 100vw" />
        </div>

        <div className="lg:pt-2">
          {franchise && (
            <Link href={`/franchises/${franchise.slug}`} className="inline-flex items-center gap-2 font-bold hover:underline hover:underline-offset-4">
              <span className="inline-block h-3 w-3" style={{ background: "var(--color-world)" }} aria-hidden />
              {franchise.name}
            </Link>
          )}
          <h1 className="display mt-3 text-[clamp(3rem,6vw,5.25rem)]">{nb(product.name)}</h1>
          <p className="mt-6 flex items-baseline gap-3">
            <span className="display text-5xl">{formatPrice(product.pricePence)}</span>
            {product.comparePricePence && <s className="text-lg text-muted">{formatPrice(product.comparePricePence)}</s>}
          </p>
          <p className="mt-1 text-sm text-muted">{product.inStock ? "In stock" : "Currently sold out"} · SKU {product.sku}</p>

          <div className="mt-8"><AddToCart inStock={product.inStock} item={{ slug: product.slug, name: product.name, pricePence: product.pricePence, image: product.images[0] ?? `/art/${product.slug}` }} /></div>

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

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related-h">
          <h2 id="related-h" className="display text-5xl">More from the universe</h2>
          <div className={`mt-8 ${GRID}`}>
            {related.map((p) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
          </div>
        </section>
      )}
    </div>
  );
}
