"use client";
import { createContext, useContext } from "react";
import type { CommerceSettings } from "@/lib/commerce-config";

const Ctx = createContext<Pick<CommerceSettings, "freeShippingPence" | "giftWrapPence">>({ freeShippingPence: null, giftWrapPence: 0 });

/** Hands the store's shipping and gift-wrap rules to client components (cart, free-shipping bar). */
export function CommerceProvider({ value, children }: { value: Pick<CommerceSettings, "freeShippingPence" | "giftWrapPence">; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useCommerce = () => useContext(Ctx);
