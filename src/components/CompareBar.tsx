"use client";
import { splitLocale } from "@/lib/i18n/config";

import { useT } from "@/components/LocaleProvider";
import Image from "next/image";
import Link from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import { COMPARE_MAX, useShopUi } from "@/components/ShopUi";

/** Floating tray listing the products chosen for comparison. */
export function CompareBar() {
  const { compare, removeCompare, clearCompare, notice } = useShopUi();
  const pathname = usePathname();
  const { t } = useT();
  if (compare.length === 0 || splitLocale(pathname).path === "/compare") return null;
  return (
    <div className="fixed inset-x-3 bottom-[4.25rem] z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-3 border border-ink/20 bg-paper p-3 shadow-2xl shadow-black/40 md:bottom-4" role="region" aria-label={t("Compare products")}>
      <ul className="flex flex-1 items-center gap-2">
        {compare.map((c) => (
          <li key={c.slug} className="relative">
            <Image src={c.image} alt={c.name} width={56} height={56} unoptimized className="h-12 w-12 border border-ink/20 object-cover sm:h-14 sm:w-14" />
            <button onClick={() => removeCompare(c.slug)} aria-label={t("Remove {name} from compare", { name: c.name })} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center bg-ink text-xs font-bold text-paper">×</button>
          </li>
        ))}
        {Array.from({ length: COMPARE_MAX - compare.length }, (_, i) => <li key={`e${i}`} aria-hidden className="hidden h-14 w-14 border border-dashed border-ink/30 sm:block" />)}
      </ul>
      <div className="flex items-center gap-3">
        <button onClick={clearCompare} className="text-sm font-bold underline underline-offset-4">{t("Clear")}</button>
        {compare.length >= 2
          ? <Link href="/compare" className="btn btn-sm">{t("Compare {n}", { n: compare.length })}</Link>
          : <span className="text-sm text-muted">{t("Add one more")}</span>}
      </div>
      {notice && <p role="status" className="w-full text-sm font-bold">{t(notice)}</p>}
    </div>
  );
}
