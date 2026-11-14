import { getT } from "@/lib/i18n/server";
import Link from "@/components/LocaleLink";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getCollections } from "@/lib/catalog";
import { isUpcoming } from "@/lib/launch";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return buildMetadata({ title: t("Collections and drops"), description: t("Themed Sparkthunder merchandise collections and upcoming drops, from Knightverge and beyond."), path: "/collections" });
}

export default async function CollectionsPage() {
  const { t, locale } = await getT();
  const collections = await getCollections();
  return (
    <div>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Collections", path: "/collections" }])} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections" }]} />
      <h1 className="display mt-6 text-4xl sm:text-5xl">{t("Collections and drops")}</h1>
      <p className="serif mt-3 max-w-2xl text-xl text-muted">{t("Themed sets and limited launches. Come back on launch day.")}</p>
      {collections.length === 0 ? <p className="mt-10 text-muted">{t("No collections yet. New drops are on their way.")}</p> : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {collections.map((c) => (
            <li key={c.slug} className="border border-ink/15 p-6">
              <p className="text-sm font-bold uppercase tracking-wide">{isUpcoming(c.launchAt) ? t("Drops {date}", { date: new Date(c.launchAt!).toLocaleDateString(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) }) : t("Available now")}</p>
              <h2 className="display mt-2 text-2xl"><Link href={`/collections/${c.slug}`} className="link-line">{c.name}</Link></h2>
              <p className="mt-2 text-muted">{c.description}</p>
              <p className="mt-3 text-sm">{c.productSlugs.length === 1 ? t("1 product") : t("{n} products", { n: c.productSlugs.length })}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
