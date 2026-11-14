"use client";
import { useT } from "@/components/LocaleProvider";

/** Translated text that works in both server and client components: <T>Sold out</T> or <T text="Compare {n}" vars={{ n: 3 }} />. */
export function T({ children, text, vars }: { children?: string; text?: string; vars?: Record<string, string | number> }) {
  const { t } = useT();
  return <>{t((text ?? children ?? "") as string, vars)}</>;
}
