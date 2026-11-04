import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Your basket", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">Your basket</h1>
      <CartView />
    </>
  );
}
