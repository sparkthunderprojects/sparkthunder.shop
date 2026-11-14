"use client";

import { localePath } from "@/lib/i18n/config";
import { useT } from "@/components/LocaleProvider";import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/db/browser";

export function SignOutButton() {
  const router = useRouter();
  const { t, locale } = useT();
  return <button className="btn" onClick={async () => { await browserClient()?.auth.signOut(); router.push(localePath("/", locale) as never); router.refresh(); }}>{t("Sign out")}</button>;
}
