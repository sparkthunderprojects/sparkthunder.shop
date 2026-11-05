import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BalanceChecker } from "@/components/BalanceChecker";

export const metadata: Metadata = {
  title: "Check your gift card balance",
  description: "Enter your Sparkthunder gift card code to see how much you have left to spend.",
  alternates: { canonical: "/gift-cards/balance" },
  robots: { index: false, follow: true },
};

export default function BalancePage() {
  return (
    <>
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Gift cards", href: "/gift-cards" }, { name: "Check balance" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">Check your gift card balance</h1>
      <p className="prose-lore mt-4 text-muted">Enter the code from your email. It starts with SPK.</p>
      <BalanceChecker />
    </>
  );
}
