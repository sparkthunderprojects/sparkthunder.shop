export type QuickVariant = { name: string; stockQty: number; pricePence?: number; comparePricePence?: number; image?: string };

const SIZE = /^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|one size|\d{1,3}(\.\d)?("|cm|mm|ml|g)?)$/i;

export const VARIANT_SEP = " / ";
export const MAX_OPTION_AXES = 3;

export type OptionGroups = {
  labels: string[];
  groups: string[][];
  /** True when the variant names hold more than one value ("Rose / 30ml"), so there is one picker per axis. */
  split: boolean;
  /** Legacy guess only: the stored parts were Size / Colour, so swap them to show Colour first. */
  swap: boolean;
};

export const splitName = (name: string) => name.split("/").map((p) => p.trim());

/**
 * A variant name is its option values joined by " / ". When the product names its option axes
 * (Shade, Size...) those are the picker labels. Without names we guess: two parts become Colour and Size.
 */
export function optionGroups(vs: QuickVariant[], optionNames: string[] = []): OptionGroups {
  const parts = vs.map((v) => splitName(v.name));
  const n = parts[0]?.length ?? 0;
  const consistent = vs.length > 0 && n >= 2 && n <= MAX_OPTION_AXES && parts.every((p) => p.length === n && p.every(Boolean));
  const uniq = (i: number) => [...new Set(parts.map((p) => p[i]))];
  if (consistent) {
    const named = optionNames.filter(Boolean);
    if (named.length === n) return { labels: named, groups: Array.from({ length: n }, (_, i) => uniq(i)), split: true, swap: false };
    if (n === 2) {
      const sizeFirst = uniq(0).every((x) => SIZE.test(x)) && !uniq(1).every((x) => SIZE.test(x));
      const [c, s] = sizeFirst ? [1, 0] : [0, 1]; // always show Colour first, Size second
      return { labels: ["Colour", "Size"], groups: [uniq(c), uniq(s)], split: true, swap: sizeFirst };
    }
    return { labels: Array.from({ length: n }, (_, i) => `Option ${i + 1}`), groups: Array.from({ length: n }, (_, i) => uniq(i)), split: true, swap: false };
  }
  const label = optionNames.filter(Boolean)[0] ?? (vs.length && vs.every((v) => SIZE.test(v.name)) ? "Size" : "Option");
  return { labels: [label], groups: [vs.map((v) => v.name)], split: false, swap: false };
}

/** The variant's values in picker order. */
export function partsOf(og: OptionGroups, name: string): string[] {
  if (!og.split) return [name];
  const p = splitName(name);
  return og.swap ? [p[1], p[0]] : p;
}

/** Find the stored variant for the chosen values (one per picker, in picker order). */
export function findVariant<V extends QuickVariant>(vs: V[], og: OptionGroups, picked: (string | null)[]): V | null {
  if (picked.some((p) => !p)) return null;
  return vs.find((v) => partsOf(og, v.name).every((x, i) => x === picked[i])) ?? null;
}

/** Cartesian product of option values, as variant names. Used by the admin generator. */
export function combinations(values: string[][]): string[] {
  return values.reduce<string[][]>((acc, vals) => (vals.length ? acc.flatMap((a) => vals.map((v) => [...a, v])) : acc), [[]])
    .map((c) => c.join(VARIANT_SEP)).filter(Boolean);
}

/** Lowest and highest selling price across a product's variants (the base price applies to variants without their own). */
export function priceRange(basePence: number, vs: { pricePence?: number }[]) {
  if (!vs.length) return { min: basePence, max: basePence };
  const prices = vs.map((v) => v.pricePence ?? basePence);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export const HEX = /^#[0-9a-fA-F]{6}$/;
