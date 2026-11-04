"use client";

import { useShopUi } from "@/components/ShopUi";
import type { QuickProduct } from "@/lib/card";

/** Centred "Quick View" button across the bottom of the image (always visible on touch, on hover for mouse). */
export function QuickViewOverlay({ quick }: { quick: QuickProduct }) {
  const { openQuick } = useShopUi();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-square items-end justify-center pb-5">
      <button type="button" onClick={() => openQuick(quick)} aria-label={`Quick view ${quick.name}`} className="btn btn-sm quick-overlay pointer-events-auto">
        Quick View
      </button>
    </div>
  );
}
