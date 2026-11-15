import Image from "next/image";
import Link from "@/components/LocaleLink";
import { getTheme } from "@/lib/theme.server";
import { getT } from "@/lib/i18n/server";

export type CatalogueLink = { label: string; href: string; count?: number; active?: boolean };

/**
 * Header block of a collection page in the Catalogue style: small title with product count, one short paragraph,
 * sub-collection links and (optionally) the store's lookbook tiles. Sizes follow the reference page exactly:
 * 16px title, 12px copy on 17px lines, 32px link row, 300 x 350 tiles with a 2px gap.
 */
export async function CatalogueHead({ title, count, description, links = [], tiles = true }: { title: string; count: number; description?: string; links?: CatalogueLink[]; tiles?: boolean }) {
  const [theme, { t }] = await Promise.all([getTheme(), getT()]);
  return (
    <div data-catalogue-head className="pt-4">
      <h1 className="text-base font-medium leading-6">{title}<sup className="ml-[3px] align-super text-[13px] font-normal text-[#737373]">{count}</sup></h1>
      {description && <p className="mt-[17px] max-w-[995px] text-xs font-light leading-[17px]">{description}</p>}
      {links.length > 0 && (
        <ul className="mt-[17px] flex h-8 items-center gap-6 text-xs" aria-label={t("Filter by category")}>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href as never} aria-current={l.active ? "page" : undefined} className={l.active ? "font-medium" : "font-light text-[#737373] hover:text-ink"}>
                {l.label}{l.count !== undefined && <sup className="ml-[3px] align-super text-[9px] font-light text-[#737373]">{l.count}</sup>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {tiles && theme.lookbook.length > 0 && (
        <ul className="-mx-(--gutter) mt-7 flex gap-[2px] overflow-x-auto px-(--gutter) pb-[21px]" aria-label={t("Featured")}>
          {theme.lookbook.map((b) => (
            <li key={b.href + b.title} className="shrink-0 pb-[2px]">
              <Link href={b.href as never} className="relative block h-[350px] w-[300px] overflow-hidden bg-[#222] text-white">
                <Image src={b.image} alt="" fill sizes="300px" unoptimized={b.image.endsWith(".svg") || b.image.startsWith("https://")} className="object-cover" />
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 text-xs leading-[19px]"><span className="block font-medium">{b.title}</span><span className="block">{b.caption}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
