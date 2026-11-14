import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { Contact, LegalPage } from "@/components/LegalPage";
import { getLegal } from "@/lib/legal";
import { getStore } from "@/lib/store";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const { t } = await getT();
  return buildMetadata({
    title: t("Terms of Use"),
    description: t("The terms for using the {store} website and buying from it, including orders, gift cards, intellectual property and limits of liability.", { store: store.name }),
    path: "/terms",
  });
}

export default async function TermsPage() {
  const { name, legalName, domain, original } = await getLegal();
  const { t } = await getT();
  return (
    <LegalPage title={t("Terms of use")} path="/terms" intro={t("These terms apply when you use {domain} and when you buy from it. By using the site or placing an order you agree to them.", { domain })}>
      <h2>{t("About this site")}</h2>
      <p>{original ? t("{domain} is the official merchandise store for the Sparkthunder family of franchises, run by {legalName}.", { domain, legalName }) : t("{domain} is the online shop of {legalName}, trading as {name}.", { domain, legalName, name })} {t("Questions about these terms can go to")} <Contact />.</p>

      <h2>{t("Products and prices")}</h2>
      <p>{t("We take care to show accurate product information, images and prices in pounds sterling. Photos and artwork are illustrative and real products may differ slightly. Delivery costs are shown at checkout before you pay. We may correct errors, and change or withdraw products and prices, at any time, but a change will never alter an order you have already paid for.")}</p>

      <h2>{t("Ordering and payment")}</h2>
      <p>{t("When you place an order you pay by card or another payment method offered at checkout. Payments are handled by our payment provider, Stripe, and we never see or store your full card details. We email you a confirmation when your payment is received, and again when your order ships.")}</p>
      <p>{t("If we cannot fulfil an order, for example because an item is out of stock or a price was shown wrongly, we will tell you and refund you in full for anything we cannot supply.")}</p>

      <h2>{t("Delivery and returns")}</h2>
      <p>{t("Our delivery charges, where we deliver and how to cancel or return an order are set out on the")} <Link href="/delivery-returns" className="link-line font-bold">{t("delivery and returns page")}</Link>. {t("Nothing in these terms affects your legal rights as a consumer.")}</p>

      <h2>{t("Gift cards")}</h2>
      <p>{t("Gift cards are delivered by email as a unique code and can be spent on anything in this shop. A balance left over stays on the card. Gift cards cannot be exchanged for cash and are not refundable once issued, apart from where the law says otherwise. Anyone with the code can spend it, so please keep it safe. If a card has an expiry date, it is shown in the email.")}</p>

      <h2>{t("Intellectual property")}</h2>
      <p>{t("All names, logos, characters, artwork, text and designs on this site belong to {legalName} or its licensors. You may view and share pages for personal, non-commercial use, but may not copy or reuse the content for other purposes without our written permission.", { legalName })}</p>

      <h2>{t("Reviews and questions")}</h2>
      <p>{t("If you post a review or a question, you confirm it is your own honest view and does not break the law or anyone’s rights. You allow us to show it on the site. We may remove anything that is unlawful, abusive or misleading.")}</p>

      <h2>{t("Using the site")}</h2>
      <ul>
        <li>{t("Do not misuse the site, attempt to disrupt it, or access it by automated means that place an unreasonable load on it.")}</li>
        <li>{t("Keep your sign-in details to yourself and tell us if you think someone else has used your account.")}</li>
        <li>{t("Links to other websites are provided for convenience and we are not responsible for their content.")}</li>
      </ul>

      <h2>{t("Liability")}</h2>
      <p>{t("We provide the site “as is” and do not guarantee it will always be available or error-free. Nothing in these terms limits liability that cannot be limited by law, including for death or personal injury caused by negligence, for fraud, or your statutory rights as a consumer. Subject to that, we are not liable for indirect or consequential loss arising from your use of the site.")}</p>

      <h2>{t("Changes and governing law")}</h2>
      <p>{t("We may update these terms and will post the new version here with a new date. These terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction over any dispute, although if you live elsewhere in the UK you can also bring a claim in your local courts.")}</p>
    </LegalPage>
  );
}
