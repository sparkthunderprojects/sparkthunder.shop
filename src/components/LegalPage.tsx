import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { getLegal } from "@/lib/legal";
import { getT } from "@/lib/i18n/server";

export const LEGAL_UPDATED_ISO = "2026-11-08";
export const LEGAL_UPDATED_LABEL = "8 November 2026";

export async function Contact() {
  const { email } = await getLegal();
  const { t } = await getT();
  return email
    ? <a className="link-line font-bold" href={`mailto:${email}`}>{email}</a>
    : <span>{t("the contact details published on this site")}</span>;
}

/** Shared layout for policy pages: readable column, dated, with breadcrumbs and structured data. Translated versions say the English text is the binding one. */
export async function LegalPage({ title, path, intro, children }: { title: string; path: string; intro: string; children: React.ReactNode }) {
  const { t, locale } = await getT();
  const date = new Date(LEGAL_UPDATED_ISO + "T00:00:00Z").toLocaleDateString(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: t("Home"), path: "/" }, { name: title, path }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: t("Home"), href: "/" }, { name: title }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{title}</h1>
      <p className="mt-3 text-sm text-muted">{t("Last updated {date}", { date })}</p>
      {locale !== "en" ? <p className="mt-3 max-w-2xl border border-ink/20 bg-paper-2 p-3 text-sm" data-legal="translation-note">{t("This page is a translation provided for your convenience. The English version is the legally binding text.")}</p> : null}
      <p className="prose-lore mt-6">{intro}</p>
      <div className="prose-lore legal mt-10">{children}</div>
    </>
  );
}
