import { normaliseCurrencies, type DisplayCurrency } from "@/lib/currency";
import { FREE_SHIPPING_PENCE, GIFT_WRAP_PENCE, SITE } from "@/lib/site";

/** A delivery zone: some countries and what delivery costs to them. The first item costs `firstItemPence`, each further item `extraItemPence`. */
export type ShippingZone = {
  name: string; countries: string[]; firstItemPence: number; extraItemPence: number; freeOverPence: number | null;
  /** Charge by parcel weight instead of item count: the price of the first band whose limit the basket fits under. Empty = charge by item count. */
  bands?: WeightBand[];
  /** For weight above the heaviest band: this much for each further started kilogram. */
  extraPerKgPence?: number;
};
export type WeightBand = { upToGrams: number; pence: number };

/** What things weigh, for weight-based delivery. A product's own weight wins, then its category's, then the default. */
export type Weights = { defaultGrams: number; byCategory: Record<string, number>; byProduct: Record<string, number> };
export const DEFAULT_WEIGHTS: Weights = { defaultGrams: 300, byCategory: {}, byProduct: {} };
export const weightOf = (w: Weights, productSlug: string, categorySlug: string): number => w.byProduct[productSlug] ?? w.byCategory[categorySlug] ?? w.defaultGrams;

const grams = (v: unknown, fallback = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : fallback; };
export function normaliseWeights(raw: unknown): Weights {
  const r = (raw ?? {}) as Partial<Weights>;
  const map = (m: unknown, max: number) => Object.fromEntries(Object.entries((m && typeof m === "object" ? m : {}) as Record<string, unknown>).filter(([k, v]) => /^[a-z0-9-]{1,80}$/.test(k) && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100000).slice(0, max).map(([k, v]) => [k, Math.round(Number(v))]));
  return { defaultGrams: grams(r.defaultGrams, DEFAULT_WEIGHTS.defaultGrams), byCategory: map(r.byCategory, 200), byProduct: map(r.byProduct, 2000) };
}

/** Money rules for one store. Safe to import anywhere (no server code). */
export type CommerceSettings = {
  /** Delivery zones. Empty = one flat rate (`shippingFlatPence`) to every country in `shippingCountries`. */
  shippingZones: ShippingZone[];
  shippingFlatPence: number;
  /** Orders at or above this (pence) ship free. null = no free-shipping offer. */
  freeShippingPence: number | null;
  giftWrapPence: number;
  /** ISO country codes the store ships to. */
  shippingCountries: string[];
  supportEmail: string;
  /** Letters at the start of order numbers and gift card codes, e.g. "SPK" in SPK-1001. */
  codePrefix: string;
  /** Charge-inclusive VAT: shop prices already contain VAT; this only works out and shows the VAT part. Off until the store is VAT registered. */
  vatEnabled: boolean;
  vatRatePercent: number;
  vatNumber: string;
  /** Printed on invoices (the business's registered address). */
  businessAddress: string;
  /** Other currencies shoppers can view prices in. Display only: orders are always charged in the store's own currency. */
  currencies: DisplayCurrency[];
  /** Item weights, used by zones that charge by weight. */
  weights: Weights;
};

export const DEFAULT_COMMERCE: CommerceSettings = {
  shippingZones: [],
  shippingFlatPence: Number(process.env.SHIPPING_FLAT_PENCE ?? 399) || 0,
  freeShippingPence: FREE_SHIPPING_PENCE,
  giftWrapPence: GIFT_WRAP_PENCE,
  shippingCountries: (process.env.SHIPPING_COUNTRIES ?? "GB").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
  supportEmail: "",
  codePrefix: "SPK",
  vatEnabled: false,
  vatRatePercent: 20,
  vatNumber: "",
  businessAddress: "",
  currencies: [],
  weights: DEFAULT_WEIGHTS,
};

/** A neutral prefix for a store that has not set one: the first letters of its id (misspetty -> MIS). */
export const derivePrefix = (storeId: string) => (storeId.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "ORD");
const cleanPrefix = (v: unknown, fallback: string) => { const p = String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5); return p.length >= 2 ? p : fallback; };

const rate = (v: unknown, fallback: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 30 ? Math.round(n * 100) / 100 : fallback; };
const pence = (v: unknown, fallback: number, max = 100000) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback; };

export function normaliseCommerce(raw: Partial<CommerceSettings> | null | undefined): CommerceSettings {
  const r = raw ?? {}, d = DEFAULT_COMMERCE;
  const zones = normaliseZones(r.shippingZones);
  const countries = zones.length ? [...new Set(zones.flatMap((z) => z.countries))] : Array.isArray(r.shippingCountries) ? [...new Set(r.shippingCountries.map((c) => String(c).trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))].slice(0, 60) : d.shippingCountries;
  const free = r.freeShippingPence === null ? null : r.freeShippingPence === undefined ? d.freeShippingPence : pence(r.freeShippingPence, 0) || null;
  const email = typeof r.supportEmail === "string" && /^\S+@\S+\.\S+$/.test(r.supportEmail.trim()) ? r.supportEmail.trim().slice(0, 120) : "";
  return { shippingZones: zones, shippingFlatPence: pence(r.shippingFlatPence, d.shippingFlatPence, 10000), freeShippingPence: free, giftWrapPence: pence(r.giftWrapPence, d.giftWrapPence, 10000), shippingCountries: countries.length ? countries : d.shippingCountries, supportEmail: email, codePrefix: cleanPrefix(r.codePrefix, d.codePrefix), vatEnabled: r.vatEnabled === true, vatRatePercent: rate(r.vatRatePercent, d.vatRatePercent), vatNumber: String(r.vatNumber ?? "").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, 20), businessAddress: String(r.businessAddress ?? "").replace(/[<>]/g, "").trim().slice(0, 300), currencies: normaliseCurrencies(r.currencies, SITE.currency), weights: normaliseWeights(r.weights) };
}

/** Clean up zones from the admin form: valid country codes, a country in only one zone (the first that names it), sensible amounts. */
export function normaliseZones(raw: unknown): ShippingZone[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>(), out: ShippingZone[] = [];
  for (const z of raw.slice(0, 12) as Partial<ShippingZone>[]) {
    const countries = [...new Set((Array.isArray(z?.countries) ? z.countries : []).map((c) => String(c).trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c) && !seen.has(c)))].slice(0, 80);
    if (!countries.length) continue;
    countries.forEach((c) => seen.add(c));
    const free = z.freeOverPence === null || z.freeOverPence === undefined ? null : pence(z.freeOverPence, 0) || null;
    const bands = (Array.isArray(z.bands) ? z.bands : []).map((b) => ({ upToGrams: grams(b?.upToGrams, 0), pence: pence(b?.pence, 0, 10000) })).filter((b) => b.upToGrams > 0).sort((a, b) => a.upToGrams - b.upToGrams).filter((b, i, all) => i === 0 || b.upToGrams !== all[i - 1].upToGrams).slice(0, 12);
    out.push({ name: String(z.name ?? "").trim().slice(0, 40) || `Zone ${out.length + 1}`, countries, firstItemPence: pence(z.firstItemPence, 0, 10000), extraItemPence: pence(z.extraItemPence, 0, 10000), freeOverPence: free, ...(bands.length ? { bands, extraPerKgPence: pence(z.extraPerKgPence, 0, 10000) } : {}) });
  }
  return out;
}

export type ShippingQuote = { ok: true; pence: number; zone: string; freeOverPence: number | null } | { ok: false; error: string };

/** What delivery costs to `country` for a basket of `itemCount` physical items worth `goodsPence` (after nothing: before discounts). Used by the basket and checkout, so they always agree. */
export function quoteShipping(c: Pick<CommerceSettings, "shippingZones" | "shippingFlatPence" | "freeShippingPence" | "shippingCountries">, country: string, itemCount: number, goodsPence: number, totalGrams = 0): ShippingQuote {
  const code = country.toUpperCase();
  if (!c.shippingZones.length) {
    if (!c.shippingCountries.includes(code)) return { ok: false, error: "Sorry, we do not deliver to that country yet." };
    return { ok: true, pence: c.freeShippingPence && goodsPence >= c.freeShippingPence ? 0 : c.shippingFlatPence, zone: "Standard delivery", freeOverPence: c.freeShippingPence };
  }
  const z = c.shippingZones.find((x) => x.countries.includes(code));
  if (!z) return { ok: false, error: "Sorry, we do not deliver to that country yet." };
  const n = Math.max(1, Math.floor(itemCount));
  const free = z.freeOverPence !== null && goodsPence >= z.freeOverPence;
  if (z.bands?.length) {
    const g = Math.max(0, Math.round(totalGrams));
    const band = z.bands.find((b) => g <= b.upToGrams);
    const top = z.bands[z.bands.length - 1];
    const price = band ? band.pence : top.pence + Math.ceil((g - top.upToGrams) / 1000) * (z.extraPerKgPence ?? 0);
    return { ok: true, pence: free ? 0 : price, zone: z.name, freeOverPence: z.freeOverPence };
  }
  return { ok: true, pence: free ? 0 : z.firstItemPence + z.extraItemPence * (n - 1), zone: z.name, freeOverPence: z.freeOverPence };
}
