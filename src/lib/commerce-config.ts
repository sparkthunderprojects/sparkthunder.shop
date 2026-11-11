import { normaliseCurrencies, type DisplayCurrency } from "@/lib/currency";
import { FREE_SHIPPING_PENCE, GIFT_WRAP_PENCE, SITE } from "@/lib/site";

/** A delivery zone: some countries and what delivery costs to them. The first item costs `firstItemPence`, each further item `extraItemPence`. */
export type ShippingZone = { name: string; countries: string[]; firstItemPence: number; extraItemPence: number; freeOverPence: number | null };

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
  /** Other currencies shoppers can view prices in. Display only: orders are always charged in the store's own currency. */
  currencies: DisplayCurrency[];
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
  currencies: [],
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
  return { shippingZones: zones, shippingFlatPence: pence(r.shippingFlatPence, d.shippingFlatPence, 10000), freeShippingPence: free, giftWrapPence: pence(r.giftWrapPence, d.giftWrapPence, 10000), shippingCountries: countries.length ? countries : d.shippingCountries, supportEmail: email, codePrefix: cleanPrefix(r.codePrefix, d.codePrefix), vatEnabled: r.vatEnabled === true, vatRatePercent: rate(r.vatRatePercent, d.vatRatePercent), vatNumber: String(r.vatNumber ?? "").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, 20), currencies: normaliseCurrencies(r.currencies, SITE.currency) };
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
    out.push({ name: String(z.name ?? "").trim().slice(0, 40) || `Zone ${out.length + 1}`, countries, firstItemPence: pence(z.firstItemPence, 0, 10000), extraItemPence: pence(z.extraItemPence, 0, 10000), freeOverPence: free });
  }
  return out;
}

export type ShippingQuote = { ok: true; pence: number; zone: string; freeOverPence: number | null } | { ok: false; error: string };

/** What delivery costs to `country` for a basket of `itemCount` physical items worth `goodsPence` (after nothing: before discounts). Used by the basket and checkout, so they always agree. */
export function quoteShipping(c: Pick<CommerceSettings, "shippingZones" | "shippingFlatPence" | "freeShippingPence" | "shippingCountries">, country: string, itemCount: number, goodsPence: number): ShippingQuote {
  const code = country.toUpperCase();
  if (!c.shippingZones.length) {
    if (!c.shippingCountries.includes(code)) return { ok: false, error: "Sorry, we do not deliver to that country yet." };
    return { ok: true, pence: c.freeShippingPence && goodsPence >= c.freeShippingPence ? 0 : c.shippingFlatPence, zone: "Standard delivery", freeOverPence: c.freeShippingPence };
  }
  const z = c.shippingZones.find((x) => x.countries.includes(code));
  if (!z) return { ok: false, error: "Sorry, we do not deliver to that country yet." };
  const n = Math.max(1, Math.floor(itemCount));
  const free = z.freeOverPence !== null && goodsPence >= z.freeOverPence;
  return { ok: true, pence: free ? 0 : z.firstItemPence + z.extraItemPence * (n - 1), zone: z.name, freeOverPence: z.freeOverPence };
}
