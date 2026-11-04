"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="btn btn-ink btn-sm" aria-label={`Basket, ${count} item${count === 1 ? "" : "s"}`}>
      Basket
      {count > 0 && <span className="bg-bolt px-1.5 py-0.5 text-xs font-extrabold text-ink">{count}</span>}
    </Link>
  );
}
