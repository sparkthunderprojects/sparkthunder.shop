import type { Metadata } from "next";
import { getLegal } from "@/lib/legal";
import { getStore } from "@/lib/store";
import { Contact, LegalPage } from "@/components/LegalPage";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return buildMetadata({
    title: "Accessibility Statement",
    description: `How ${store.name} aims to be usable by everyone: our accessibility approach, known limitations and how to report a problem.`,
    path: "/accessibility",
  });
}

export default async function AccessibilityPage() {
  const { name } = await getLegal();
  return (
    <LegalPage title="Accessibility statement" path="/accessibility" intro={`We want everyone to be able to browse and shop at ${name}. We are building the site to meet the Web Content Accessibility Guidelines (WCAG) 2.2 level AA.`}>
      <h2>What we do</h2>
      <ul>
        <li>Every page works with a keyboard, including menus, search suggestions, filters, quick view and the basket.</li>
        <li>A “Skip to content” link is available at the top of every page.</li>
        <li>Pop-up panels trap focus sensibly, close with the Escape key and announce themselves to screen readers.</li>
        <li>Images have text descriptions, form fields have labels, and colour is never the only way information is shown.</li>
        <li>Animation is switched off for visitors whose device is set to reduce motion.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>The site has not yet had an independent accessibility audit. Some product images are placeholder artwork while photography is being prepared, and we are still checking colour contrast and screen reader behaviour across every page.</p>

      <h2>Tell us about a problem</h2>
      <p>If something is hard to use, or you need information in another format, contact us at <Contact /> and tell us the page and what went wrong. We will aim to reply within five working days.</p>

      <h2>Enforcement</h2>
      <p>If you are not happy with our response you can contact the Equality Advisory and Support Service (EASS) at equalityadvisoryservice.com.</p>
    </LegalPage>
  );
}
