"use client";

import { useT } from "@/components/LocaleProvider";
import { useCart } from "@/components/CartProvider";
import { useMoney } from "@/components/Currency";
import { useCommerce } from "@/components/CommerceProvider";

/** Progress toward free shipping. Renders nothing unless NEXT_PUBLIC_FREE_SHIPPING_PENCE is configured. */
export function FreeShippingBar() {
  const money = useMoney();
  const { t } = useT();
  const { subtotalPence, count } = useCart();
  const c = useCommerce();
  const FREE_SHIPPING_PENCE = c.freeShippingPence;
  if (c.shippingZones.length || !FREE_SHIPPING_PENCE || count === 0) return null; // with zones the basket shows the offer for the chosen country
  const left = FREE_SHIPPING_PENCE - subtotalPence;
  const pct = Math.min(100, Math.round((subtotalPence / FREE_SHIPPING_PENCE) * 100));
  return (
    <div className="border-b border-ink/15 bg-paper-2 px-5 py-3">
      <p className="text-sm font-bold" role="status">
        {left > 0 ? t("You’re {amount} away from free shipping", { amount: money(left) }) : t("You’ve unlocked free shipping")}
      </p>
      <div className="mt-2 h-2.5 border border-ink/20 bg-paper" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("Progress to free shipping")}>
        <div className="h-full bg-bolt transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
