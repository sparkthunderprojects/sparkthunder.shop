import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { getLegal } from "@/lib/legal";

export const LEGAL_UPDATED_LABEL = "8 November 2026";

export async function Contact() {
  const { email } = await getLegal();
  return email
    ? <a className="link-line font-bold" href={`mailto:${email}`}>{email}</a>
    : <span>the contact details published on this site</span>;
}

/** Shared layout for policy pages: readable column, dated, with breadcrumbs and structured data. */
export function LegalPage({ title, path, intro, children }: { title: string; path: string; intro: string; children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: title, path }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: title }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {LEGAL_UPDATED_LABEL}</p>
      <p className="prose-lore mt-6">{intro}</p>
      <div className="prose-lore legal mt-10">{children}</div>
    </>
  );
}
