import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getCommerce } from "@/lib/commerce";
import { enabledMethods, PAY_INFO, PAY_LATER_SMALL_PRINT } from "@/lib/pay-later";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Ways to pay", description: "See every way to pay for your order, including pay later options.", path: "/payment-options" });
}

export default async function PaymentOptionsPage() {
  await connection();
  const methods = enabledMethods((await getCommerce()).payLater).map((m) => PAY_INFO[m]);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Ways to pay", path: "/payment-options" }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Ways to pay" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">Ways to pay</h1>
      <p className="mt-4 max-w-2xl text-muted">Pay by card or Apple Pay or Google Pay at checkout{methods.length ? ", or choose one of these:" : "."}</p>
      {methods.length > 0 && (
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {methods.map((m) => (
            <li key={m.id}>
              <Link href={`/payment-options/${m.id}`} className="flex h-full flex-col gap-3 p-8 text-black transition-transform hover:-translate-y-1" style={{ background: m.tint }} data-payoption={m.id}>
                <Image src={m.logo} alt="" width={m.logoW} height={m.logoH} className="h-14 w-auto self-start" />
                <span className="display text-3xl">{m.name}</span>
                <span>{m.hubLine}</span>
                <span className="mt-auto pt-2 font-bold underline underline-offset-4">How {m.name} works &rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {methods.length > 0 && <p className="mt-8 max-w-3xl text-xs text-muted">{PAY_LATER_SMALL_PRINT}</p>}
    </>
  );
}
