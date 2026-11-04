/** Product grid: 2 columns on phones up to 6 on very wide screens. */
export const GRID = "grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6";

/** Non-breaking hyphens so product names like "T-Shirt" never split across lines in big headings. */
export const nb = (s: string) => s.replace(/-/g, "‑");
