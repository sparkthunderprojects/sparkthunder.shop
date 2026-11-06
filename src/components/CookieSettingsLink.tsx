"use client";
import { openConsentSettings } from "@/lib/consent";

export function CookieSettingsLink({ className = "", children = "Cookie settings" }: { className?: string; children?: React.ReactNode }) {
  return <button type="button" onClick={openConsentSettings} className={className}>{children}</button>;
}
