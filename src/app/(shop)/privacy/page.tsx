import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/LegalPage";
import { getLegal } from "@/lib/legal";
import { getStore } from "@/lib/store";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return buildMetadata({
    title: "Privacy Policy",
    description: `How ${store.name} handles personal data: what we collect, why, who we share it with, how long we keep it and your rights under UK GDPR.`,
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  const { name, legalName, domain } = await getLegal();
  return (
    <LegalPage title="Privacy policy" path="/privacy" intro={`We collect only what we need to run the shop. This page explains what ${name} stores, why, who helps us do it, and what you can ask us to do about it.`}>
      <h2>Who we are</h2>
      <p>{legalName} is the controller of personal data collected through {domain}. You can reach us via <Contact />.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Orders.</strong> Your name, email address, phone number, delivery address, what you bought and what you paid. Card payments are taken by Stripe on its own secure page: we never see or store your card number.</li>
        <li><strong>Your account.</strong> If you create an account or sign in with email, Google or My Sparkthunder, we store your email address and a record that you signed in. With Google or My Sparkthunder we receive your name and email address from them. We never see your password for those services.</li>
        <li><strong>Rewards.</strong> Points you earn from orders and reviews, linked to your email address.</li>
        <li><strong>Reviews and questions.</strong> What you write, your rating and the name you give. These are shown on the product page.</li>
        <li><strong>Gift cards.</strong> The recipient&rsquo;s name and email address, your name and your message, so we can deliver the card.</li>
        <li><strong>Back-in-stock alerts and newsletter.</strong> Your email address, the product you asked about, and the date you signed up.</li>
        <li><strong>Your basket, favourites, compare list and preferences.</strong> These are saved in your own browser (local storage) and are not sent to us until you check out.</li>
        <li><strong>Technical data.</strong> Our hosting provider processes your IP address and the pages you request to deliver the site and keep it secure.</li>
      </ul>
      <p>We do not use advertising or analytics trackers unless you switch them on in the cookie settings.</p>

      <h2>Why we use it, and our legal basis</h2>
      <ul>
        <li>Taking, delivering and supporting your order, and sending order emails: to carry out our contract with you.</li>
        <li>Keeping order and payment records: to meet our legal and tax obligations.</li>
        <li>Newsletter emails and optional cookies: your consent, which you can withdraw at any time.</li>
        <li>Running and securing the site, preventing fraud and answering your messages: our legitimate interest in providing a working, safe shop.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We use trusted service providers who process data on our behalf and only for these purposes:</p>
      <ul>
        <li>Stripe, to take payments.</li>
        <li>Supabase, to store our database and handle sign-in.</li>
        <li>Resend, to send order, gift card and account emails.</li>
        <li>Printify and its print partners, who make and post items printed to order. They receive your name, delivery address, email and phone number for your delivery only.</li>
        <li>Our hosting provider, to serve the website.</li>
        <li>Delivery carriers, who receive your name, address and phone number to deliver your parcel.</li>
      </ul>
      <p>We do not sell your personal data. Some providers may process data outside the UK; where they do, we expect them to use appropriate safeguards.</p>

      <h2>How long we keep it</h2>
      <p>Order records are kept for as long as the law requires for accounting, normally six years. Your account and rewards are kept until you ask us to delete them. Newsletter addresses are kept until you unsubscribe. Reviews stay on the site until you ask us to remove them. Server logs are kept for a short period by our host.</p>

      <h2>Your rights</h2>
      <p>Under UK data protection law you can ask to see, correct or delete your personal data, object to or restrict how we use it, ask for a copy in a portable format, and withdraw consent. To use any of these rights, contact us using the details above. We may need to keep some order records even if you ask us to delete your account. You can also complain to the Information Commissioner&rsquo;s Office at ico.org.uk.</p>

      <h2>Changes</h2>
      <p>We will post any changes to this policy here and update the date at the top.</p>
    </LegalPage>
  );
}
