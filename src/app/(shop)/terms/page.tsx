import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/LegalPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Use",
  description: "The terms for using the Sparkthunder Shop website, including product information, intellectual property and limits of liability.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" path="/terms" intro="These terms apply when you use sparkthunder.shop. By using the site you agree to them. Terms of sale will be published here before the shop starts taking orders.">
      <h2>About this site</h2>
      <p>sparkthunder.shop is the official merchandise store for the Sparkthunder family of franchises, run by Sparkthunder. Questions about these terms can go to <Contact />.</p>

      <h2>Products and prices</h2>
      <p>We take care to show accurate product information, images and prices in pounds sterling. Photos and artwork are illustrative and real products may differ slightly. We may correct errors, and change or withdraw products and prices, at any time.</p>

      <h2>Ordering</h2>
      <p>The shop is not yet taking orders. Adding items to your basket or favourites does not reserve stock or create a contract. Terms of sale, delivery and returns will be published before ordering opens.</p>

      <h2>Intellectual property</h2>
      <p>All names, logos, characters, artwork, text and designs on this site belong to Sparkthunder or its licensors. You may view and share pages for personal, non-commercial use, but may not copy or reuse the content for other purposes without our written permission.</p>

      <h2>Using the site</h2>
      <ul>
        <li>Do not misuse the site, attempt to disrupt it, or access it by automated means that place an unreasonable load on it.</li>
        <li>Links to other websites are provided for convenience and we are not responsible for their content.</li>
      </ul>

      <h2>Liability</h2>
      <p>We provide the site “as is” and do not guarantee it will always be available or error-free. Nothing in these terms limits liability that cannot be limited by law, including for death or personal injury caused by negligence, or for fraud. Subject to that, we are not liable for indirect or consequential loss arising from your use of the site.</p>

      <h2>Changes and governing law</h2>
      <p>We may update these terms and will post the new version here with a new date. These terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction over any dispute.</p>
    </LegalPage>
  );
}
