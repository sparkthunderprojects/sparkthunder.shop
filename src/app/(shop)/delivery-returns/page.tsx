import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { Contact, LegalPage } from "@/components/LegalPage";
import { getLegal } from "@/lib/legal";
import { getStore } from "@/lib/store";
import { buildMetadata } from "@/lib/seo-metadata";
import { formatPrice } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const { t } = await getT();
  return buildMetadata({
    title: t("Delivery and Returns"),
    description: t("Delivery costs, where {store} delivers, and how to cancel an order or send something back.", { store: store.name }),
    path: "/delivery-returns",
  });
}

const countryNameIn = (code: string, loc: string) => { try { return new Intl.DisplayNames([loc], { type: "region" }).of(code) ?? code; } catch { return code; } };

export default async function DeliveryReturnsPage() {
  const { name, commerce: c } = await getLegal();
  const { t, locale } = await getT();
  const countryName = (code: string) => countryNameIn(code, locale);
  const countries = c.shippingCountries.map(countryName);
  return (
    <LegalPage title={t("Delivery and returns")} path="/delivery-returns" intro={t("How {name} delivers your order, and what to do if you change your mind or something is not right.", { name })}>
      <h2>{t("Where we deliver and what it costs")}</h2>
      {c.shippingZones.length ? (
        <ul>
          {c.shippingZones.map((z) => (
            <li key={z.name}><strong>{z.name}</strong> ({z.countries.map(countryName).join(", ")}): {z.bands?.length ? t("by the weight of your order: {bands}", { bands: z.bands.map((b, i) => `${t("up to {weight} {price}", { weight: b.upToGrams >= 1000 ? `${b.upToGrams / 1000} kg` : `${b.upToGrams} g`, price: formatPrice(b.pence) })}${i === z.bands!.length - 1 && z.extraPerKgPence ? t(", then {price} for each extra kg", { price: formatPrice(z.extraPerKgPence) }) : ""}`).join(", ") }) : `${t("{price} for the first item", { price: formatPrice(z.firstItemPence) })}${z.extraItemPence ? t(", {price} for each extra item", { price: formatPrice(z.extraItemPence) }) : t(", nothing extra for more items")}`}.{z.freeOverPence ? t(" Free on orders of {price} or more.", { price: formatPrice(z.freeOverPence) }) : ""}</li>
          ))}
        </ul>
      ) : (
        <>
          <p>{t("We currently deliver to: {list}.", { list: countries.join(", ") })}</p>
          <p>{t("Delivery is {price} per order.", { price: formatPrice(c.shippingFlatPence) })}{c.freeShippingPence ? t(" Orders of {price} or more qualify for free delivery.", { price: formatPrice(c.freeShippingPence) }) : ""}</p>
        </>
      )}
      <p>{t("Gift cards are sent by email and can be bought from anywhere.")}{c.giftWrapPence ? t(" Gift wrapping is {price} per order if you choose it at checkout.", { price: formatPrice(c.giftWrapPence) }) : ""}{t(" The exact amount is always shown in your basket and at checkout before you pay.")}</p>

      <h2>{t("When it will arrive")}</h2>
      <p>{t("Many of our products are printed to order, so they are made after you buy: allow a few working days for printing before your order is posted, plus the delivery time. Items in one order can be made in different places and arrive in separate parcels. We email you when your order ships, with tracking details where the carrier provides them. If something is out of stock or delayed we will let you know.")}</p>

      <h2>{t("Changing your mind")}</h2>
      <p>{t("If you are buying as a consumer, you can cancel your order and return the goods for any reason within 14 days of receiving them. To cancel, tell us clearly (an email is fine) at")} <Contact />{t(", then send the goods back to us within a further 14 days. We refund the price of the goods, and the standard delivery charge, within 14 days of getting the goods back or of you showing us proof of postage, using the same payment method you used. You pay the cost of sending items back unless we tell you otherwise.")}</p>
      <p>{t("Please return items unused and in their original packaging where possible. We may reduce a refund if goods come back damaged or used beyond what is needed to check them.")}</p>

      <h2>{t("Things that cannot be returned")}</h2>
      <ul>
        <li>{t("Gift cards, once issued.")}</li>
        <li>{t("Items made or personalised to your request.")}</li>
        <li>{t("Sealed items that cannot be returned for health or hygiene reasons once the seal has been broken, such as make-up and skincare.")}</li>
      </ul>

      <h2>{t("If something is wrong")}</h2>
      <p>{t("If an item arrives faulty, damaged or not as described, contact us at")} <Contact />{t(" with your order number and, if you can, a photo. You have legal rights under the Consumer Rights Act 2015 to a repair, replacement or refund, and we will put it right. These rights are in addition to the cancellation right above and are not affected by anything on this page.")}</p>

      <h2>{t("More")}</h2>
      <p>{t("See our")} <Link href="/terms" className="link-line font-bold">{t("terms of use")}</Link>{t(" for the rest of the terms of sale, and our ")}<Link href="/privacy" className="link-line font-bold">{t("privacy policy")}</Link>{t(" for how we handle your details.")}</p>
    </LegalPage>
  );
}
