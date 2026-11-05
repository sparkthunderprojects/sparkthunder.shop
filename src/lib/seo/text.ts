export function slugify(input: string): string {
  return input
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export const includesKeyword = (haystack: string, keyword: string) =>
  keyword.trim() !== "" && haystack.toLowerCase().includes(keyword.trim().toLowerCase());

export const keywordSlug = (kw: string) => slugify(kw);

/** Approximate rendered width of text in Google's SERP font (Arial) in pixels. */
const W: Record<string, number> = {
  " ": 0.278, "!": 0.278, '"': 0.355, "#": 0.556, $: 0.556, "%": 0.889, "&": 0.667, "'": 0.191, "(": 0.333, ")": 0.333, "*": 0.389, "+": 0.584, ",": 0.278, "-": 0.333, ".": 0.278, "/": 0.278,
  ":": 0.278, ";": 0.278, "<": 0.584, "=": 0.584, ">": 0.584, "?": 0.556, "@": 1.015,
  A: 0.667, B: 0.667, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778, H: 0.722, I: 0.278, J: 0.5, K: 0.667, L: 0.556, M: 0.833, N: 0.722, O: 0.778, P: 0.667, Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722, V: 0.667, W: 0.944, X: 0.667, Y: 0.667, Z: 0.611,
  a: 0.556, b: 0.556, c: 0.5, d: 0.556, e: 0.556, f: 0.278, g: 0.556, h: 0.556, i: 0.222, j: 0.222, k: 0.5, l: 0.222, m: 0.833, n: 0.556, o: 0.556, p: 0.556, q: 0.556, r: 0.333, s: 0.5, t: 0.278, u: 0.556, v: 0.5, w: 0.722, x: 0.5, y: 0.5, z: 0.5,
  "|": 0.26, "£": 0.556, "–": 0.556, "—": 1, "…": 1,
};
export function pixelWidth(text: string, fontPx: number): number {
  let w = 0;
  for (const ch of text) w += (W[ch] ?? (/[0-9]/.test(ch) ? 0.556 : 0.6)) * fontPx;
  return Math.round(w);
}
/** Google truncates titles at about 600px (20px font) and desktop descriptions at about 920px (14px font). */
export const TITLE_PX = 600;
export const DESC_PX = 920;
export const titlePx = (t: string) => pixelWidth(t, 20);
export const descPx = (t: string) => pixelWidth(t, 14);
