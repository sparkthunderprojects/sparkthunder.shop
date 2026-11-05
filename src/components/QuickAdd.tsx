"use client";

import { useAddToBasket } from "@/components/useAddToBasket";
import type { QuickProduct } from "@/lib/card";

export function QuickAdd({ quick }: { quick: QuickProduct }) {
  const addOrChoose = useAddToBasket();
  const choose = quick.variants.length > 0;
  return (
    <button
      type="button"
      onClick={() => addOrChoose(quick)}
      aria-label={`${choose ? "Choose options for" : "Add"} ${quick.name}${choose ? "" : " to basket"}`}
      className="pointer-events-auto absolute inset-x-0 bottom-0 bg-ink py-3 text-center text-sm font-bold text-paper transition-transform duration-200 max-md:translate-y-0 md:translate-y-full md:group-focus-within:translate-y-0 md:group-hover:translate-y-0"
    >
      {choose ? "Choose options" : "Add to basket"}
    </button>
  );
}
