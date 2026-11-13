"use client";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { useT } from "@/components/LocaleProvider";
import { LOCALE_INFO, localePath, splitLocale } from "@/lib/i18n/config";

/** Footer language list. Plain links so search engines and shoppers can both follow them; hidden when the store speaks one language. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, enabled } = useLocale();
  const { t } = useT();
  const pathname = usePathname() || "/";
  if (enabled.length < 2) return null;
  const plain = splitLocale(pathname).path;
  return (
    <nav aria-label={t("lang.switch")} className={`flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm ${className}`}>
      <span className="mr-1 text-ink/60">{t("footer.language")}:</span>
      {enabled.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 ? <span aria-hidden className="text-ink/30">·</span> : null}
          <a
            href={localePath(plain, l)}
            lang={LOCALE_INFO[l].html}
            hrefLang={LOCALE_INFO[l].html}
            aria-current={l === locale ? "true" : undefined}
            onClick={(e) => { if (l !== locale) { e.preventDefault(); window.location.assign(localePath(plain, l) + window.location.search + window.location.hash); } }}
            className={l === locale ? "font-bold underline underline-offset-4" : "px-1 hover:underline hover:underline-offset-4"}
          >{LOCALE_INFO[l].name}</a>
        </span>
      ))}
    </nav>
  );
}
