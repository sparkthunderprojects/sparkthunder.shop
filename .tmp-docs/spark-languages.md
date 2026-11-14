# Spark Merchant: languages (supersedes the languages section that was in spark-storefront-pages.md)

## Overview (English, French, German, Spanish)
English stays at the plain address; French, German and Spanish live at /fr, /de, /es. src/proxy.ts strips the prefix, sets the x-locale header and rewrites to the normal route (admin, api and auth are never prefixed; /fr/admin is a 404). A store only serves languages it has switched on: Admin > Languages (settings key "languages", no SQL). A language that is off is a 404, and the footer language list is hidden when only English is on.
Code: src/lib/i18n/{config,dictionaries,server}.ts, LocaleProvider, LocaleLink (replaces next/link in all storefront files; admin keeps plain Link), LanguageSwitcher in the footer.
SEO: every language is its own canonical; hreflang lists all switched-on languages plus x-default (English); the sitemap lists each address once per language with alternates; html lang follows the language.

### Stage 2: all fixed storefront text translated (13-14 Nov 2026)
Phrase book: the English sentence is the key. Components call t("English sentence", { vars }) (client useT(), server getT(), or <T> in shared components). Translations live in src/lib/i18n/phrases/*.ts as [en, fr, de, es] rows, registered in phrases/index.ts. A missing row falls back to the English sentence (never blank). tests/phrases.test.ts fails the build if any literal t("...") phrase lacks a French, German or Spanish row, or a row loses its {placeholders}. Tone: French "vous", German "Sie", Spanish "tu".
Translated: header/menus, home, shop, product page, cart and basket drawer, search, cookie banner, wishlist, compare, collections, categories, franchises, gifts, characters, gift cards (hub, send, balance), account and sign-in, checkout success, unsubscribe, 404, payment options hub and all nine method pages (src/lib/pay-later.ts via translatePay), Help Centre (all 29 articles, search, contact form, delivery lines in help-ctx), legal pages (privacy, terms, delivery and returns, cookies, accessibility) and server error messages shown to shoppers.
Legal pages are convenience translations: each translated page shows a note that the English text is the legally binding version. A native speaker (and ideally a lawyer for German imprint/withdrawal wording) should still check them before real EU selling.
Tests: tests/i18n.test.ts, tests/phrases.test.ts, scripts/i18n-test.mjs (in ci-browser.sh; loads 23 pages in each language and flags leftover English).

### Still English (later stages)
- Store and product content: product names/descriptions/details, collection and franchise blurbs, store tagline and hero text, announcement text. Plan: AI translation on save into a translations table (needs a held SQL block and an API key; Haiku 5.5 costs about 0.0004 USD per product per language). Until then /fr etc. show English product text under translated pages, so switch a language on only when that content is ready.
- Order and account emails per language.
- Charging in EUR (display currency only today).
- Redirects after sign-in and checkout return the shopper to English addresses.
- Keywords used for Help Centre search stay English (the article text is searched in the shopper's language).
