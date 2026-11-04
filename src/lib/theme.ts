import type { CSSProperties } from "react";

/** Inline style that re-themes a subtree to a franchise's colour world. */
export function worldStyle(accent?: string | null): CSSProperties {
  return accent ? ({ ["--color-world" as string]: accent } as CSSProperties) : {};
}

/** Mix a hex colour toward the page's near-black, mirroring the CSS `.world` background. */
export function darkWorld(hex: string, amount = 0.26, base = "#0a0b16"): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = p(hex.length === 7 ? hex : "#11142a");
  const [br, bg, bb] = p(base);
  const m = (a: number, c: number) => Math.round(a * amount + c * (1 - amount)).toString(16).padStart(2, "0");
  return `#${m(r, br)}${m(g, bg)}${m(b, bb)}`;
}
