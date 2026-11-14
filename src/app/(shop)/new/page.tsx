import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
import { getFranchises, getProducts } from "@/lib/catalog";
import { breadcrumbLd, itemListLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return buildMetadata({
  title: t("New Arrivals - Latest Official Merchandise"),
  description: t("The newest official Sparkthunder merchandise: fresh apparel, collectibles, prints and tabletop gear from Knightverge, Occult Inc and more."),
  path: "/new",
});
}

export default async function NewPage() {
  const { t } = await getT();
  const [products, franchises] = await Promise.all([getProducts({ onlyNew: true }), getFranchises()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "New arrivals", path: "/new" }]), itemListLd("New arrivals", "/new", products)]} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "New arrivals" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{t("New arrivals")}</h1>
      <p className="prose-lore mt-6 text-muted">{t("The latest official merchandise to land across every Sparkthunder franchise.")}</p>
      <div className="mt-10"><Listing products={products} franchiseNames={nameBySlug} flush /></div>
    </>
  );
}
