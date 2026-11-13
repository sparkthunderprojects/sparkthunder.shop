/** Languages the platform can speak. English is the original and lives at the plain address; the others get /fr, /de and /es. */
export const LOCALES = ["en", "fr", "de", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_INFO: Record<Locale, { name: string; english: string; html: string; og: string }> = {
  en: { name: "English", english: "English", html: "en-GB", og: "en_GB" },
  fr: { name: "Français", english: "French", html: "fr", og: "fr_FR" },
  de: { name: "Deutsch", english: "German", html: "de", og: "de_DE" },
  es: { name: "Español", english: "Spanish", html: "es", og: "es_ES" },
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** Pages that are never translated or prefixed (admin tools, API routes, sign-in callbacks). */
const UNPREFIXED = /^\/(admin|api|auth|_next|art|uploads|franchise|hero)(\/|$)/;

/** "/fr/products/x" gives { locale: "fr", path: "/products/x" }; anything else is English as it stands. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = /^\/(fr|de|es)(\/.*)?$/.exec(pathname);
  if (!m) return { locale: DEFAULT_LOCALE, path: pathname };
  return { locale: m[1] as Locale, path: m[2] || "/" };
}

/** Put the language in front of an internal address. External links, anchors, mailto and admin addresses are left alone. */
export function localePath(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return href;
  if (!href.startsWith("/") || href.startsWith("//") || UNPREFIXED.test(href)) return href;
  if (splitLocale(href.split(/[?#]/)[0]).locale !== DEFAULT_LOCALE) return href; // already prefixed
  if (href === "/") return `/${locale}`;
  return `/${locale}${href}`;
}

/** Which languages a store has switched on. English is always on. */
export function normaliseLanguages(raw: unknown): Locale[] {
  const list = Array.isArray((raw as { enabled?: unknown } | null)?.enabled) ? ((raw as { enabled: unknown[] }).enabled.filter(isLocale) as Locale[]) : [];
  return LOCALES.filter((l) => l === DEFAULT_LOCALE || list.includes(l));
}
export const DEFAULT_LANGUAGES: Locale[] = ["en"];
