"use client";
import { openConsentSettings } from "@/lib/consent";
import { useT } from "@/components/LocaleProvider";

export function CookieSettingsLink({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  const { t } = useT();
  return <button type="button" onClick={openConsentSettings} className={className}>{children ?? t("legal.cookies")}</button>;
}
