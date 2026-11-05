"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

/** Empties the basket once the order exists; while it is still being created, re-checks every few seconds. */
export function ClearBasket({ active, retry }: { active: boolean; retry: boolean }) {
  const { clear } = useCart();
  const router = useRouter();
  useEffect(() => {
    if (active) {
      // Remove storage first: the provider above loads it in its own effect, which runs after this one.
      try { localStorage.removeItem("sparkthunder-cart-v1"); localStorage.removeItem("sparkthunder-giftcard-v1"); } catch {}
      clear();
      return;
    }
    if (!retry) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [active, retry, clear, router]);
  return null;
}
