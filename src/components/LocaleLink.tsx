"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { localePath } from "@/lib/i18n/config";

/** Drop-in for next/link: internal addresses keep the shopper in their language (/fr/..., /de/..., /es/...). */
export default function LocaleLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const { locale } = useLocale();
  const to = typeof href === "string" ? localePath(href, locale) : href && typeof href === "object" && typeof href.pathname === "string" ? { ...href, pathname: localePath(href.pathname, locale) } : href;
  return <Link href={to as never} {...rest} />;
}
