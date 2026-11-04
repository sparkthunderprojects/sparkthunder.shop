/** Product grid: 2 columns on phones up to 6 on very wide screens. */
export const GRID = "grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6";

/** Non-breaking hyphens so product names like "T-Shirt" never split across lines in big headings. */
export const nb = (s: string) => s.replace(/-/g, "‑");

/** Square icon button used on product cards (favourite, quick view, compare). */
export const ICON_BTN = "flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper hover:bg-bolt";
