"use client";

import { useT } from "@/components/LocaleProvider";
import Link from "@/components/LocaleLink";
import { useEffect, useState } from "react";
import { PanelProductRow } from "@/components/PanelProductRow";
import { readRecent, clearRecent } from "@/components/Recent";
import { useShopUi } from "@/components/ShopUi";
import { SlideOver } from "@/components/SlideOver";
import { useProductLookup } from "@/components/useProductLookup";

/** Recently viewed products, as a frosted panel that slides out from the right. */
export function RecentDrawer() {
  const { t } = useT();
  const { panel, closePanel } = useShopUi();
  const open = panel === "recent";
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => { if (open) setSlugs(readRecent()); }, [open]);
  const { products, loading } = useProductLookup(slugs, open);

  return (
    <SlideOver open={open} onClose={closePanel} title={t("Recently viewed")}>
      {slugs.length === 0 ? (
        <div className="flex-1 p-6">
          <p className="serif text-xl text-muted">{t("You haven’t looked at any products yet.")}</p>
          <Link href="/shop" onClick={closePanel} className="btn mt-6">{t("Browse everything")}</Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-white/15 overflow-y-auto px-5" aria-busy={loading}>
            {products.map((p) => <PanelProductRow key={p.slug} product={p} onNavigate={closePanel} />)}
            {products.length === 0 && <li className="py-6 text-muted">{t("Loading…")}</li>}
          </ul>
          <div className="border-t border-white/15 p-5">
            <button onClick={() => { clearRecent(); setSlugs([]); }} className="text-sm underline underline-offset-4 hover:text-muted">{t("Clear recently viewed")}</button>
          </div>
        </>
      )}
    </SlideOver>
  );
}
