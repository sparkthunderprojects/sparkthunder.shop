"use client";

import { useShopUi } from "@/components/ShopUi";

/** Header icon that opens the recently viewed panel. */
export function RecentButton() {
  const { openPanel } = useShopUi();
  return (
    <button onClick={() => openPanel("recent")} aria-haspopup="dialog" aria-label="Recently viewed" className="flex h-10 w-10 items-center justify-center hover:bg-paper-2">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
    </button>
  );
}
