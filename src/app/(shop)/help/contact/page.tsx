import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { connection } from "next/server";
import { HelpContactForm } from "@/components/HelpContactForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getHelpCtx } from "@/lib/help-ctx";
import { topicFromParam } from "@/lib/help";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return buildMetadata({ title: t("Contact us"), description: t("Send us a message and we will reply by email."), path: "/help/contact" });
}

export default async function HelpContact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  await connection();
  const { t } = await getT();
  const [ctx, sp] = await Promise.all([getHelpCtx(), searchParams]);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: t("Home"), path: "/" }, { name: t("Help Centre"), path: "/help" }, { name: t("Contact us"), path: "/help/contact" }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: t("Home"), href: "/" }, { name: t("Help Centre"), href: "/help" }, { name: t("Contact us") }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{t("Contact us")}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t("Tell us what you need and we will reply by email as soon as we can. You may find an instant answer in the")} <Link href="/help" className="link-line font-bold">{t("Help Centre")}</Link>.</p>
      <div className="mt-8">
        {ctx.email ? <HelpContactForm topic={topicFromParam(sp.topic)} /> : <p>{t("Messages are not set up for this shop yet. Please use the contact details published on this site.")}</p>}
      </div>
      {ctx.email ? <p className="mt-8 text-sm text-muted">{t("Prefer email? Write to")} <a className="link-line font-bold" href={`mailto:${ctx.email}`}>{ctx.email}</a>.</p> : null}
    </>
  );
}
