export type QuickVariant = { name: string; stockQty: number; pricePence?: number };

const SIZE = /^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|one size|\d{1,3}(\.\d)?("|cm|mm)?)$/i;

export type OptionGroups = { labels: string[]; groups: string[][]; split: boolean };

/**
 * Variants are stored as single names. "Black / L" style names (two parts) become a Colour picker and a Size picker;
 * anything else is one picker, labelled Size when every value looks like a size.
 */
export function optionGroups(vs: QuickVariant[]): OptionGroups {
  const parts = vs.map((v) => v.name.split("/").map((p) => p.trim()));
  if (vs.length > 0 && parts.every((p) => p.length === 2 && p[0] && p[1])) {
    const uniq = (i: number) => [...new Set(parts.map((p) => p[i]))];
    const sizeFirst = uniq(0).every((x) => SIZE.test(x)) && !uniq(1).every((x) => SIZE.test(x));
    const colourIdx = sizeFirst ? 1 : 0, sizeIdx = sizeFirst ? 0 : 1; // always show Colour first, Size second
    return { labels: ["Colour", "Size"], groups: [uniq(colourIdx), uniq(sizeIdx)], split: true };
  }
  return { labels: [vs.length && vs.every((v) => SIZE.test(v.name)) ? "Size" : "Option"], groups: [vs.map((v) => v.name)], split: false };
}

/** Find the stored variant for the chosen parts (Colour then Size for split names, regardless of how it was stored). */
export function findVariant(vs: QuickVariant[], og: OptionGroups, picked: (string | null)[]): QuickVariant | null {
  if (picked.some((p) => !p)) return null;
  if (!og.split) return vs.find((v) => v.name === picked[0]) ?? null;
  return vs.find((v) => {
    const p = v.name.split("/").map((x) => x.trim());
    return (p[0] === picked[0] && p[1] === picked[1]) || (p[1] === picked[0] && p[0] === picked[1]);
  }) ?? null;
}
