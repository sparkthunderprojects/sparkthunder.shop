import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/LegalPage";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
  title: "Privacy Policy",
  description: "How the Sparkthunder Shop handles personal data: what we collect, why, how long we keep it and your rights under UK GDPR.",
  path: "/privacy",
});
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" path="/privacy" intro="We collect as little as we can. This page explains exactly what the Sparkthunder Shop stores, why, and what you can ask us to do about it.">
      <h2>Who we are</h2>
      <p>Sparkthunder is the controller of personal data collected through sparkthunder.shop. You can reach us via <Contact />.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Newsletter sign-ups.</strong> If you join the list we store your email address and the date you signed up. We use it only to email you about new merchandise releases.</li>
        <li><strong>Your basket, favourites, compare list and browsing preferences.</strong> These are saved in your own browser (local storage) so they are there when you come back. They are not sent to us.</li>
        <li><strong>Server logs.</strong> Our hosting provider processes technical data such as IP address and requested page to deliver the site and keep it secure.</li>
      </ul>
      <p>The shop does not currently take orders or payments, has no customer accounts, and does not use advertising or analytics trackers. If that changes we will update this page before it does.</p>

      <h2>Why we use it, and our legal basis</h2>
      <ul>
        <li>Newsletter emails: your consent, which you give by submitting the form. You can withdraw it at any time.</li>
        <li>Running and securing the site: our legitimate interest in providing a working, safe website.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We use service providers to host the site and to store newsletter sign-ups. They process data on our behalf and only for those purposes. We do not sell your personal data.</p>

      <h2>How long we keep it</h2>
      <p>Newsletter email addresses are kept until you unsubscribe or ask us to delete them. Server logs are kept for a short period by our host.</p>

      <h2>Your rights</h2>
      <p>Under UK data protection law you can ask to see, correct or delete your personal data, object to or restrict how we use it, and withdraw consent. To use any of these rights, contact us using the details above. You can also complain to the Information Commissioner’s Office at ico.org.uk.</p>

      <h2>Changes</h2>
      <p>We will post any changes to this policy here and update the date at the top.</p>
    </LegalPage>
  );
}
