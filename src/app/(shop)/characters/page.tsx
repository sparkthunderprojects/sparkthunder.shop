import { getT } from "@/lib/i18n/server";
import Link from "@/components/LocaleLink";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getFranchises } from "@/lib/catalog";
import { shopperList } from "@/lib/character-config";
import { getCharacters } from "@/lib/characters";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return buildMetadata({ title: t("Shop by character"), description: t("Find official merchandise for your favourite characters."), path: "/characters" });
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

export default async function CharactersPage() {
  const { t } = await getT();
  const [all, franchises] = await Promise.all([getCharacters(), getFranchises()]);
  const list = shopperList(all);
  const accent = Object.fromEntries(franchises.map((f) => [f.slug, f.accent]));
  return (
    <div>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Shop by character", path: "/characters" }])} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop by character" }]} />
      <h1 className="display mt-6 text-4xl sm:text-5xl">{t("Shop by character")}</h1>
      <p className="serif mt-3 max-w-2xl text-xl text-muted">{t("Pick a hero, villain or legend and see everything made for them.")}</p>
      {list.length === 0 ? <p className="mt-10 text-muted">{t("Character merchandise is on its way.")}</p> : (
        <ul className="char-grid mt-10" aria-label={t("Characters")}>
          {list.map((c) => (
            <li key={c.slug}>
              <Link href={`/characters/${c.slug}`} className="char-tile" style={accent[c.franchiseSlug] ? ({ ["--char-accent" as string]: accent[c.franchiseSlug] }) : undefined} data-character={c.slug}>
                {c.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.image} alt="" loading="lazy" decoding="async" className="char-img" />
                  : <span className="char-initials" aria-hidden>{initials(c.name)}</span>}
                <span className="char-name">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
