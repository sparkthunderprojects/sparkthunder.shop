import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BalanceChecker } from "@/components/BalanceChecker";
import { getStore } from "@/lib/store";
import { getCommerce } from "@/lib/commerce";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return {
    title: "Check your gift card balance",
    description: `Enter your ${store.name} gift card code to see how much you have left to spend.`,
    alternates: { canonical: "/gift-cards/balance" },
    robots: { index: false, follow: true },
  };
}

export default async function BalancePage() {
  const { codePrefix } = await getCommerce();
  return (
    <>
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Gift cards", href: "/gift-cards" }, { name: "Check balance" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">Check your gift card balance</h1>
      <p className="prose-lore mt-4 text-muted">Enter the code from your email. It starts with {codePrefix}.</p>
      <BalanceChecker />
    </>
  );
}
