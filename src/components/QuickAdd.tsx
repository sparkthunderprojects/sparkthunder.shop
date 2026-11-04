"use client";

import { useCart } from "@/components/CartProvider";

export function QuickAdd({ item }: { item: { slug: string; name: string; pricePence: number; image: string } }) {
  const { add } = useCart();
  return (
    <button
      type="button"
      onClick={() => add(item, 1)}
      aria-label={`Add ${item.name} to basket`}
      className="pointer-events-auto absolute inset-x-0 bottom-0 bg-ink py-3 text-center text-sm font-bold text-paper transition-transform duration-200 max-md:translate-y-0 md:translate-y-full md:group-focus-within:translate-y-0 md:group-hover:translate-y-0"
    >
      Add to basket
    </button>
  );
}
