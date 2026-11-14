"use client";

import { useT } from "@/components/LocaleProvider";
import { HeartButton } from "@/components/HeartButton";
import { useShopUi } from "@/components/ShopUi";
import type { QuickProduct } from "@/lib/card";
import { ICON_BTN } from "@/lib/ui";

/** Favourite always shows; quick view and compare appear on hover/focus (always on touch tablets). */
export function CardActions({ quick, hideQuick = false }: { quick: QuickProduct; hideQuick?: boolean }) {
  const { openQuick, inCompare, toggleCompare } = useShopUi();
  const { t } = useT();
  const compared = inCompare(quick.slug);
  return (
    <div className="absolute right-2 top-2 z-10 flex flex-col gap-2">
      <HeartButton slug={quick.slug} name={quick.name} />
      <div className="card-extra flex-col gap-2">
        {!hideQuick && <button type="button" onClick={() => openQuick(quick)} aria-label={t("Quick view {name}", { name: quick.name })} title={t("Quick view")} className={ICON_BTN}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" />
          </svg>
        </button>}
        <button
          type="button"
          onClick={() => toggleCompare({ slug: quick.slug, name: quick.name, image: quick.image })}
          aria-pressed={compared}
          aria-label={compared ? t("Remove {name} from compare", { name: quick.name }) : t("Compare {name}", { name: quick.name })}
          title={compared ? t("Remove from compare") : t("Compare")}
          className={`${ICON_BTN} ${compared ? "!bg-bolt !text-(--color-on-accent)" : ""}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
