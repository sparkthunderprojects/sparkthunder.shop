import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { HelpContactForm } from "@/components/HelpContactForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getHelpCtx } from "@/lib/help-ctx";
import { topicFromParam } from "@/lib/help";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Contact us", description: "Send us a message and we will reply by email.", path: "/help/contact" });
}

export default async function HelpContact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  await connection();
  const [ctx, sp] = await Promise.all([getHelpCtx(), searchParams]);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Help Centre", path: "/help" }, { name: "Contact us", path: "/help/contact" }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Help Centre", href: "/help" }, { name: "Contact us" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">Contact us</h1>
      <p className="mt-4 max-w-2xl text-muted">Tell us what you need and we will reply by email as soon as we can. You may find an instant answer in the <Link href="/help" className="link-line font-bold">Help Centre</Link> first.</p>
      <div className="mt-8">
        {ctx.email ? <HelpContactForm topic={topicFromParam(sp.topic)} /> : <p>Messages are not set up for this shop yet. Please use the contact details published on this site.</p>}
      </div>
      {ctx.email ? <p className="mt-8 text-sm text-muted">Prefer email? Write to <a className="link-line font-bold" href={`mailto:${ctx.email}`}>{ctx.email}</a>.</p> : null}
    </>
  );
}
