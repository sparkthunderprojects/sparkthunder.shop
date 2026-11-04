import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Your basket", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <>
      <h1 className="display pt-10 text-[clamp(3rem,8vw,6.5rem)]">Your basket</h1>
      <CartView />
    </>
  );
}
