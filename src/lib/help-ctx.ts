import { getLegal } from "@/lib/legal";
import { enabledMethods, PAY_INFO } from "@/lib/pay-later";
import { formatPrice } from "@/lib/site";
import { helpArticles, type HelpCtx } from "@/lib/help";

const countryName = (code: string) => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; } };

/** The facts the help answers quote, read from this store's own settings. */
export async function getHelpCtx(): Promise<HelpCtx> {
  const { name, email, commerce: c } = await getLegal();
  const deliveryLines = c.shippingZones.length
    ? c.shippingZones.map((z) => {
        const where = z.countries.map(countryName).join(", ");
        const cost = z.bands?.length ? `priced by the weight of your order, from ${formatPrice(Math.min(...z.bands.map((b) => b.pence)))}` : `${formatPrice(z.firstItemPence)} for the first item${z.extraItemPence ? `, ${formatPrice(z.extraItemPence)} for each extra item` : ""}`;
        return `${z.name} (${where}): ${cost}.${z.freeOverPence ? ` Free on orders of ${formatPrice(z.freeOverPence)} or more.` : ""}`;
      })
    : [`Delivery is ${formatPrice(c.shippingFlatPence)} per order.`];
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
  return { ctx, articles: helpArticles(ctx), original };
}
