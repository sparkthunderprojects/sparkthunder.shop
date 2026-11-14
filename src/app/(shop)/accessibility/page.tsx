import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { getLegal } from "@/lib/legal";
import { getStore } from "@/lib/store";
import { Contact, LegalPage } from "@/components/LegalPage";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const { t } = await getT();
  return buildMetadata({
    title: t("Accessibility Statement"),
    description: t("How {store} aims to be usable by everyone: our accessibility approach, known limitations and how to report a problem.", { store: store.name }),
    path: "/accessibility",
  });
}

export default async function AccessibilityPage() {
  const { name } = await getLegal();
  const { t } = await getT();
  return (
    <LegalPage title={t("Accessibility statement")} path="/accessibility" intro={t("We want everyone to be able to browse and shop at {name}. We are building the site to meet the Web Content Accessibility Guidelines (WCAG) 2.2 level AA.", { name })}>
      <h2>{t("What we do")}</h2>
      <ul>
        <li>{t("Every page works with a keyboard, including menus, search suggestions, filters, quick view and the basket.")}</li>
        <li>{t("A “Skip to content” link is available at the top of every page.")}</li>
        <li>{t("Pop-up panels trap focus sensibly, close with the Escape key and announce themselves to screen readers.")}</li>
        <li>{t("Images have text descriptions, form fields have labels, and colour is never the only way information is shown.")}</li>
        <li>{t("Animation is switched off for visitors whose device is set to reduce motion.")}</li>
      </ul>

      <h2>{t("Known limitations")}</h2>
      <p>{t("The site has not yet had an independent accessibility audit. Some product images are placeholder artwork while photography is being prepared, and we are still checking colour contrast and screen reader behaviour across every page.")}</p>

      <h2>{t("Tell us about a problem")}</h2>
      <p>{t("If something is hard to use, or you need information in another format, contact us at")} <Contact />{t(" and tell us the page and what went wrong. We will aim to reply within five working days.")}</p>

      <h2>{t("Enforcement")}</h2>
      <p>{t("If you are not happy with our response you can contact the Equality Advisory and Support Service (EASS) at equalityadvisoryservice.com.")}</p>
    </LegalPage>
  );
}
