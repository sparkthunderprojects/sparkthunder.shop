import { FREE_SHIPPING_PENCE, GIFT_WRAP_PENCE } from "@/lib/site";

/** Money rules for one store. Safe to import anywhere (no server code). */
export type CommerceSettings = {
  shippingFlatPence: number;
  /** Orders at or above this (pence) ship free. null = no free-shipping offer. */
  freeShippingPence: number | null;
  giftWrapPence: number;
  /** ISO country codes the store ships to. */
  shippingCountries: string[];
  supportEmail: string;
  /** Letters at the start of order numbers and gift card codes, e.g. "SPK" in SPK-1001. */
  codePrefix: string;
};

export const DEFAULT_COMMERCE: CommerceSettings = {
  shippingFlatPence: Number(process.env.SHIPPING_FLAT_PENCE ?? 399) || 0,
  freeShippingPence: FREE_SHIPPING_PENCE,
  giftWrapPence: GIFT_WRAP_PENCE,
  shippingCountries: (process.env.SHIPPING_COUNTRIES ?? "GB").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
  supportEmail: "",
  codePrefix: "SPK",
};

/** A neutral prefix for a store that has not set one: the first letters of its id (misspetty -> MIS). */
export const derivePrefix = (storeId: string) => (storeId.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "ORD");
const cleanPrefix = (v: unknown, fallback: string) => { const p = String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5); return p.length >= 2 ? p : fallback; };

const pence = (v: unknown, fallback: number, max = 100000) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback; };

export function normaliseCommerce(raw: Partial<CommerceSettings> | null | undefined): CommerceSettings {
  const r = raw ?? {}, d = DEFAULT_COMMERCE;
  const countries = Array.isArray(r.shippingCountries) ? [...new Set(r.shippingCountries.map((c) => String(c).trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))].slice(0, 60) : d.shippingCountries;
  const free = r.freeShippingPence === null ? null : r.freeShippingPence === undefined ? d.freeShippingPence : pence(r.freeShippingPence, 0) || null;
  const email = typeof r.supportEmail === "string" && /^\S+@\S+\.\S+$/.test(r.supportEmail.trim()) ? r.supportEmail.trim().slice(0, 120) : "";
  return { shippingFlatPence: pence(r.shippingFlatPence, d.shippingFlatPence, 10000), freeShippingPence: free, giftWrapPence: pence(r.giftWrapPence, d.giftWrapPence, 10000), shippingCountries: countries.length ? countries : d.shippingCountries, supportEmail: email, codePrefix: cleanPrefix(r.codePrefix, d.codePrefix) };
}
