import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/LegalPage";
import { getLegal } from "@/lib/legal";
import { getStore } from "@/lib/store";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const { t } = await getT();
  return buildMetadata({
    title: t("Privacy Policy"),
    description: t("How {store} handles personal data: what we collect, why, who we share it with, how long we keep it and your rights under UK GDPR.", { store: store.name }),
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  const { name, legalName, domain } = await getLegal();
  const { t } = await getT();
  return (
    <LegalPage title={t("Privacy policy")} path="/privacy" intro={t("We collect only what we need to run the shop. This page explains what {name} stores, why, who helps us do it, and what you can ask us to do about it.", { name })}>
      <h2>{t("Who we are")}</h2>
      <p>{t("{legalName} is the controller of personal data collected through {domain}. You can reach us via", { legalName, domain })} <Contact />.</p>

      <h2>{t("What we collect")}</h2>
      <ul>
        <li><strong>{t("Orders.")}</strong> {t("Your name, email address, phone number, delivery address, what you bought and what you paid. Card payments are taken by Stripe on its own secure page: we never see or store your card number.")}</li>
        <li><strong>{t("Your account.")}</strong> {t("If you create an account or sign in with email, Google or My Sparkthunder, we store your email address and a record that you signed in. With Google or My Sparkthunder we receive your name and email address from them. We never see your password for those services.")}</li>
        <li><strong>{t("Rewards.")}</strong> {t("Points you earn from orders and reviews, linked to your email address.")}</li>
        <li><strong>{t("Reviews and questions.")}</strong> {t("What you write, your rating and the name you give. These are shown on the product page.")}</li>
        <li><strong>{t("Gift cards.")}</strong> {t("The recipient’s name and email address, your name and your message, so we can deliver the card.")}</li>
        <li><strong>{t("Back-in-stock alerts and newsletter.")}</strong> {t("Your email address, the product you asked about, and the date you signed up.")}</li>
        <li><strong>{t("Your basket, favourites, compare list and preferences.")}</strong> {t("These are saved in your own browser (local storage) and are not sent to us until you check out.")}</li>
        <li><strong>{t("Technical data.")}</strong> {t("Our hosting provider processes your IP address and the pages you request to deliver the site and keep it secure.")}</li>
      </ul>
      <p>{t("We do not use advertising or analytics trackers unless you switch them on in the cookie settings.")}</p>

      <h2>{t("Why we use it, and our legal basis")}</h2>
      <ul>
        <li>{t("Taking, delivering and supporting your order, and sending order emails: to carry out our contract with you.")}</li>
        <li>{t("Keeping order and payment records: to meet our legal and tax obligations.")}</li>
        <li>{t("Newsletter emails and optional cookies: your consent, which you can withdraw at any time.")}</li>
        <li>{t("Running and securing the site, preventing fraud and answering your messages: our legitimate interest in providing a working, safe shop.")}</li>
      </ul>

      <h2>{t("Who we share it with")}</h2>
      <p>{t("We use trusted service providers who process data on our behalf and only for these purposes:")}</p>
      <ul>
        <li>{t("Stripe, to take payments.")}</li>
        <li>{t("Supabase, to store our database and handle sign-in.")}</li>
        <li>{t("Resend, to send order, gift card and account emails.")}</li>
        <li>{t("Printify and its print partners, who make and post items printed to order. They receive your name, delivery address, email and phone number for your delivery only.")}</li>
        <li>{t("Our hosting provider, to serve the website.")}</li>
        <li>{t("Delivery carriers, who receive your name, address and phone number to deliver your parcel.")}</li>
      </ul>
      <p>{t("We do not sell your personal data. Some providers may process data outside the UK; where they do, we expect them to use appropriate safeguards.")}</p>

      <h2>{t("How long we keep it")}</h2>
      <p>{t("Order records are kept for as long as the law requires for accounting, normally six years. Your account and rewards are kept until you ask us to delete them. Newsletter addresses are kept until you unsubscribe. Reviews stay on the site until you ask us to remove them. Server logs are kept for a short period by our host.")}</p>

      <h2>{t("Your rights")}</h2>
      <p>{t("Under UK data protection law you can ask to see, correct or delete your personal data, object to or restrict how we use it, ask for a copy in a portable format, and withdraw consent. To use any of these rights, contact us using the details above. We may need to keep some order records even if you ask us to delete your account. You can also complain to the Information Commissioner’s Office at ico.org.uk.")}</p>

      <h2>{t("Changes")}</h2>
      <p>{t("We will post any changes to this policy here and update the date at the top.")}</p>
    </LegalPage>
  );
}
