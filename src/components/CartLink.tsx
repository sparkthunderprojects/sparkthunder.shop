"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative rounded-full border border-white/15 px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent" aria-label={`Basket, ${count} item${count === 1 ? "" : "s"}`}>
      Basket
      {count > 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-black">{count}</span>}
    </Link>
  );
}
