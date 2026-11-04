import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site";

export const LEGAL_UPDATED_LABEL = "4 November 2026";

export function Contact() {
  return CONTACT_EMAIL
    ? <a className="link-line font-bold" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
    : <span>the contact details published on this site</span>;
}

/** Shared layout for policy pages: readable column, dated, with breadcrumbs and structured data. */
export function LegalPage({ title, path, intro, children }: { title: string; path: string; intro: string; children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: title, path }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: title }]} /></div>
      <h1 className="display mt-6 text-[clamp(3rem,8vw,6.5rem)]">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {LEGAL_UPDATED_LABEL}</p>
      <p className="prose-lore mt-6">{intro}</p>
      <div className="prose-lore legal mt-10">{children}</div>
    </>
  );
}
