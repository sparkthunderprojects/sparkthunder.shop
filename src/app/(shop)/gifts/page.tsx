import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getAllProducts, getFranchises } from "@/lib/catalog";
import { breadcrumbLd, itemListLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { GRID } from "@/lib/ui";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return buildMetadata({
  title: t("Gifts for Fans - Official Merchandise by Price"),
  description: t("Find the right gift from the Sparkthunder universe. Official Knightverge and Occult Inc merchandise for readers, players and collectors, sorted by price."),
  path: "/gifts",
});
}

const BANDS = [
  { id: "under-15", label: "Under £15", min: 0, max: 1500, blurb: "Small, easy gifts: pins, pads and stocking fillers that still feel like the real thing." },
  { id: "15-to-25", label: "£15 to £25", min: 1500, max: 2500, blurb: "The sweet spot for birthdays: tees, mugs, prints and dice sets." },
  { id: "25-to-50", label: "£25 to £50", min: 2500, max: 5000, blurb: "Bigger pieces for the dedicated fan: hoodies, collectibles and statement items." },
];

export default async function GiftsPage() {
  const { t } = await getT();
  const [products, franchises] = await Promise.all([getAllProducts(), getFranchises()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const inStock = products.filter((p) => p.inStock);
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Gifts", path: "/gifts" }]), itemListLd("Gifts", "/gifts", inStock)]} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Gifts" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{t("Gifts for fans")}</h1>
      <div className="prose-lore mt-6 space-y-4 text-muted">
        <p>{t("Official Sparkthunder merchandise makes an easy gift, because everything here is made by the people who created the stories. Whether you are shopping for a long-time Knightverge reader, a tabletop player who needs new dice, or someone who loves the gothic style of Occult Inc, the pieces below arrive ready to be enjoyed.")}</p>
        <p>{t("Start with what you want to spend. Each section lists every item currently in stock at that price, from small stocking fillers to premium collectibles, and every product page lists its materials, size and care details so there are no surprises.")}</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-ink/15 py-3 font-bold" aria-label={t("Jump to a price range")}>
        {BANDS.map((b) => <a key={b.id} href={`#${b.id}`} className="hover:underline hover:underline-offset-4">{t(b.label)}</a>)}
      </div>
      {BANDS.map((b) => {
        const list = inStock.filter((p) => p.pricePence >= b.min && p.pricePence < b.max);
        if (list.length === 0) return null;
        return (
          <section key={b.id} id={b.id} aria-labelledby={`${b.id}-h`} className="mt-16 scroll-mt-28">
            <h2 id={`${b.id}-h`} className="display text-2xl sm:text-3xl">{t(b.label)}</h2>
            <p className="serif mt-2 max-w-xl text-lg text-muted">{t(b.blurb)}</p>
            <div className={`mt-6 ${GRID}`}>
              {list.map((p) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
            </div>
          </section>
        );
      })}
    </>
  );
}
