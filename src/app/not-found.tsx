import { getT } from "@/lib/i18n/server";
import Link from "@/components/LocaleLink";
import { ShopShell } from "@/components/ShopShell";

export default async function GlobalNotFound() {
  const { t } = await getT();
  return (
    <ShopShell>
      <div className="pt-24">
        <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)]">{t("Page not found")}</h1>
        <p className="prose-lore mt-6 text-muted">{t("That page has moved or never existed. Pick a franchise to keep browsing.")}</p>
        <Link href="/franchises" className="btn mt-8">{t("Browse franchises")}</Link>
      </div>
    </ShopShell>
  );
}
