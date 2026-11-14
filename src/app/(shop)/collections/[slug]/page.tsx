import { getT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Countdown } from "@/components/Countdown";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
import { getAllProducts, getCategories, getCollection, getCollections, getFranchises } from "@/lib/catalog";
import { isUpcoming } from "@/lib/launch";
import { breadcrumbLd, clip, itemListLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await getCollection(slug);
  const { t } = await getT();
  if (!c) return { title: t("Collection not found"), robots: { index: false } };
  return buildMetadata({ title: t("{name} collection", { name: c.name }), description: clip(c.description || t("{name}: official Sparkthunder merchandise.", { name: c.name }), 160), path: `/collections/${c.slug}`, image: c.image || undefined });
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const { slug } = await props.params;
  const { t } = await getT();
  const c = await getCollection(slug);
  if (!c) notFound();
  const [all, franchises, categories] = await Promise.all([getAllProducts(), getFranchises(), getCategories()]);
  const products = c.productSlugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const path = `/collections/${c.slug}`;
  const upcoming = isUpcoming(c.launchAt);
  return (
    <div>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Collections", path: "/collections" }, { name: c.name, path }]), itemListLd(`${c.name} collection`, path, products)]} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections", href: "/collections" }, { name: c.name }]} />
      <h1 className="display mt-6 text-4xl sm:text-5xl">{c.name}</h1>
      {c.description ? <p className="serif mt-3 max-w-2xl text-xl text-muted">{c.description}</p> : null}
      {upcoming ? <Countdown to={c.launchAt!} label={t("This collection drops in")} className="mt-8" /> : null}
      {products.length === 0 ? <p className="mt-10 text-muted">{t("Products are being added to this collection.")}</p> : (
        <div className="mt-10"><Listing products={products} franchiseNames={Object.fromEntries(franchises.map((f) => [f.slug, f.name]))} categoryNames={Object.fromEntries(categories.map((x) => [x.slug, x.name]))} flush /></div>
      )}
    </div>
  );
}
