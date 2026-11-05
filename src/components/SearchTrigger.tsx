"use client";

import { useShopUi } from "@/components/ShopUi";

/** The header's search field. Clicking it opens the full-width search drop-down. */
export function SearchTrigger() {
  const { openPanel } = useShopUi();
  return (
    <button onClick={() => openPanel("search")} aria-haspopup="dialog" aria-label="Search the shop"
      className="flex w-44 items-center gap-2 border-b border-ink/30 px-1 py-1.5 text-left text-sm text-muted hover:border-ink hover:text-ink xl:w-60">
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></svg>
      Search the shop
    </button>
  );
}
