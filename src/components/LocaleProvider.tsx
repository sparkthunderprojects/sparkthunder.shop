"use client";
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { dictionary, translate, type Dict, type DictKey } from "@/lib/i18n/dictionaries";

type Ctx = { locale: Locale; enabled: Locale[]; dict: Dict };
const LocaleContext = createContext<Ctx>({ locale: DEFAULT_LOCALE, enabled: [DEFAULT_LOCALE], dict: dictionary(DEFAULT_LOCALE) });

export function LocaleProvider({ locale, enabled, children }: { locale: Locale; enabled: Locale[]; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, enabled, dict: dictionary(locale) }), [locale, enabled]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
/** Translate a key in a client component. */
export function useT() {
  const { dict, locale } = useContext(LocaleContext);
  return useMemo(() => ({ locale, t: (key: DictKey, vars?: Record<string, string | number>) => translate(dict, key, vars) }), [dict, locale]);
}
