import { getLegal } from "@/lib/legal";
import { getT } from "@/lib/i18n/server";
import { enabledMethods, PAY_INFO } from "@/lib/pay-later";
import { formatPrice } from "@/lib/site";
import { helpArticles, type HelpCtx } from "@/lib/help";

const countryNameIn = (code: string, loc: string) => { try { return new Intl.DisplayNames([loc], { type: "region" }).of(code) ?? code; } catch { return code; } };

/** The facts the help answers quote, read from this store's own settings. */
export async function getHelpCtx(): Promise<HelpCtx> {
  const { name, email, commerce: c } = await getLegal();
  const { t, locale } = await getT();
  const countryName = (code: string) => countryNameIn(code, locale);
  const deliveryLines = c.shippingZones.length
    ? c.shippingZones.map((z) => {
        const where = z.countries.map(countryName).join(", ");
        const cost = z.bands?.length ? t("priced by the weight of your order, from {price}", { price: formatPrice(Math.min(...z.bands.map((b) => b.pence))) }) : `${t("{price} for the first item", { price: formatPrice(z.firstItemPence) })}${z.extraItemPence ? t(", {price} for each extra item", { price: formatPrice(z.extraItemPence) }) : ""}`;
        return `${z.name} (${where}): ${cost}.${z.freeOverPence ? t(" Free on orders of {price} or more.", { price: formatPrice(z.freeOverPence) }) : ""}`;
      })
    : [t("Delivery is {price} per order.", { price: formatPrice(c.shippingFlatPence) })];
  return {
    name, email, deliveryLines,
    freeOverPence: c.shippingZones.length ? 0 : c.freeShippingPence ?? 0,
    giftWrapPence: c.giftWrapPence,
    countries: c.shippingCountries.map(countryName),
    payPages: enabledMethods(c.payLater).filter((m) => ["paypal", "klarna", "clearpay", "amazonpay", "revolutpay"].includes(m)).map((m) => ({ id: m, name: PAY_INFO[m].name })),
  };
}

export async function getHelp() {
  const ctx = await getHelpCtx();
  const { original } = await getLegal();
  const { t } = await getT();
  return { ctx, articles: helpArticles(ctx, t), original };
}
