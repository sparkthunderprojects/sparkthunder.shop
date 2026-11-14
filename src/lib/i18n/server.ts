import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { storeTag } from "@/lib/tags";
import { DEFAULT_LANGUAGES, DEFAULT_LOCALE, isLocale, normaliseLanguages, type Locale } from "./config";
import { dictionary, translate } from "./dictionaries";

/** The language of this request: the proxy sets it from the /fr, /de or /es part of the address. */
export async function getLocale(): Promise<Locale> {
  const v = (await headers()).get("x-locale");
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Languages this store has switched on (cached, busted with the "settings" tag). */
export const getLanguages = async (): Promise<Locale[]> => {
  const storeId = await currentStoreId();
  return unstable_cache(
    async () => {
      const db = publicClient(storeId);
      if (!db) return DEFAULT_LANGUAGES;
      const { data } = await db.from("settings").select("value").eq("key", "languages").maybeSingle();
      return normaliseLanguages((data as { value?: unknown } | null)?.value);
    },
    ["languages-v1", storeId],
    { tags: [storeTag("settings", storeId)], revalidate: 600 },
  )();
};

/** The request's language, or a 404 when this store has not switched that language on. */
export async function requireLocale(): Promise<Locale> {
  const [locale, enabled] = await Promise.all([getLocale(), getLanguages()]);
  if (!enabled.includes(locale)) notFound();
  return locale;
}

/** A translate function for server components. */
export async function getT() {
  const locale = await getLocale();
  const dict = dictionary(locale);
  return { locale, t: (key: string, vars?: Record<string, string | number>) => translate(dict, key, vars) };
}
