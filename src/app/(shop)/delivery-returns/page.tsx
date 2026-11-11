import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/LegalPage";
import { getLegal } from "@/lib/legal";
import { getStore } from "@/lib/store";
import { buildMetadata } from "@/lib/seo-metadata";
import { formatPrice } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return buildMetadata({
    title: "Delivery and Returns",
    description: `Delivery costs, where ${store.name} delivers, and how to cancel an order or send something back.`,
    path: "/delivery-returns",
  });
}

const countryName = (code: string) => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; } };

export default async function DeliveryReturnsPage() {
  const { name, commerce: c } = await getLegal();
  const countries = c.shippingCountries.map(countryName);
  return (
    <LegalPage title="Delivery and returns" path="/delivery-returns" intro={`How ${name} delivers your order, and what to do if you change your mind or something is not right.`}>
      <h2>Where we deliver and what it costs</h2>
      {c.shippingZones.length ? (
        <ul>
          {c.shippingZones.map((z) => (
            <li key={z.name}><strong>{z.name}</strong> ({z.countries.map(countryName).join(", ")}): {formatPrice(z.firstItemPence)} for the first item{z.extraItemPence ? `, ${formatPrice(z.extraItemPence)} for each extra item` : ", nothing extra for more items"}.{z.freeOverPence ? ` Free on orders of ${formatPrice(z.freeOverPence)} or more.` : ""}</li>
          ))}
        </ul>
      ) : (
        <>
          <p>We currently deliver to: {countries.join(", ")}.</p>
          <p>Delivery is {formatPrice(c.shippingFlatPence)} per order.{c.freeShippingPence ? ` Orders of ${formatPrice(c.freeShippingPence)} or more qualify for free delivery.` : ""}</p>
        </>
      )}
      <p>Gift cards are sent by email and can be bought from anywhere.{c.giftWrapPence ? ` Gift wrapping is ${formatPrice(c.giftWrapPence)} per order if you choose it at checkout.` : ""} The exact amount is always shown in your basket and at checkout before you pay.</p>

      <h2>When it will arrive</h2>
      <p>Many of our products are printed to order, so they are made after you buy: allow a few working days for printing before your order is posted, plus the delivery time. Items in one order can be made in different places and arrive in separate parcels. We email you when your order ships, with tracking details where the carrier provides them. If something is out of stock or delayed we will let you know.</p>

      <h2>Changing your mind</h2>
      <p>If you are buying as a consumer, you can cancel your order and return the goods for any reason within 14 days of receiving them. To cancel, tell us clearly (an email is fine) at <Contact />, then send the goods back to us within a further 14 days. We refund the price of the goods, and the standard delivery charge, within 14 days of getting the goods back or of you showing us proof of postage, using the same payment method you used. You pay the cost of sending items back unless we tell you otherwise.</p>
      <p>Please return items unused and in their original packaging where possible. We may reduce a refund if goods come back damaged or used beyond what is needed to check them.</p>

      <h2>Things that cannot be returned</h2>
      <ul>
        <li>Gift cards, once issued.</li>
        <li>Items made or personalised to your request.</li>
        <li>Sealed items that cannot be returned for health or hygiene reasons once the seal has been broken, such as make-up and skincare.</li>
      </ul>

      <h2>If something is wrong</h2>
      <p>If an item arrives faulty, damaged or not as described, contact us at <Contact /> with your order number and, if you can, a photo. You have legal rights under the Consumer Rights Act 2015 to a repair, replacement or refund, and we will put it right. These rights are in addition to the cancellation right above and are not affected by anything on this page.</p>

      <h2>More</h2>
      <p>See our <Link href="/terms" className="link-line font-bold">terms of use</Link> for the rest of the terms of sale, and our <Link href="/privacy" className="link-line font-bold">privacy policy</Link> for how we handle your details.</p>
    </LegalPage>
  );
}
