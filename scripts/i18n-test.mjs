// Real-browser test of languages, in demo mode.
//   node scripts/i18n-test.mjs 3540
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3540"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const go = async (path) => { const r = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" }); const b = page.getByRole("button", { name: "Reject all" }); await b.waitFor({ timeout: 3000 }).then(() => b.click()).catch(() => {}); return r; };
try {
  // Off by default: only English
  check((await go("/fr")).status() === 404, "/fr is a 404 until French is switched on");
  await go("/");
  check((await page.locator("footer nav[aria-label='Change language']").count()) === 0, "no language list while only English is on");
  check((await page.locator("html").getAttribute("lang")) === "en-GB", "English page says en-GB");

  // Switch all three on in the admin
  await page.goto(`${base}/admin/languages`, { waitUntil: "networkidle" });
  for (const n of [/Français/, /Deutsch/, /Español/]) await page.getByLabel(n).check();
  await page.getByRole("button", { name: "Save languages" }).click();
  await page.getByText("Saved.").waitFor({ timeout: 8000 });

  // French home
  const r = await go("/fr");
  check(r.status() === 200, "/fr loads once French is on");
  check((await page.locator("html").getAttribute("lang")) === "fr", "French page says lang=fr");
  const head = await page.locator("header").first().innerText();
  check(/Boutique/.test(head) && /Cadeaux/.test(head), "header menus are in French");
  const foot = await page.locator("footer").innerText();
  check(/Centre d’aide/.test(foot) && /Confidentialité/.test(foot), "footer is in French");
  const hrefs = await page.locator("header a[href]").evaluateAll((a) => a.map((x) => x.getAttribute("href")).filter((h) => h && h.startsWith("/")));
  check(hrefs.length > 3 && hrefs.every((h) => h.startsWith("/fr") || h.startsWith("/account") || h.startsWith("/admin") || h.startsWith("#")), `header links stay in French (${hrefs.filter((h) => !h.startsWith("/fr")).join(",") || "all prefixed"})`);
  const alts = await page.locator("link[rel=alternate][hreflang]").evaluateAll((l) => l.map((x) => x.getAttribute("hreflang")));
  check(["en-GB", "fr", "de", "es", "x-default"].every((c) => alts.includes(c)), `hreflang names every language (${alts.join(",")})`);
  const canon = await page.locator("link[rel=canonical]").getAttribute("href");
  check(/\/fr\/?$/.test(canon ?? ""), `French canonical is its own address (${canon})`);

  // Navigate in French and switch language on the same page
  await go("/fr/shop");
  check(/\/fr\/shop/.test(page.url()) && (await page.locator("main").innerText()).length > 50, "/fr/shop renders");
  const sw = page.locator("footer nav[aria-label='Changer de langue']");
  check((await sw.locator("a").count()) === 4, "language list shows four languages");
  await sw.getByText("Deutsch").click();
  await page.waitForURL(/\/de\/shop/);
  check((await page.locator("html").getAttribute("lang")) === "de", "switching keeps the page and changes the language");
  check(/Geschenke/.test(await page.locator("header").first().innerText()), "German menus");
  await page.locator("footer nav a", { hasText: "English" }).click();
  await page.waitForURL((u) => u.pathname === "/shop");
  check((await page.locator("html").getAttribute("lang")) === "en-GB", "back to English at the plain address");

  // A product page, then something that must never be prefixed
  await go("/es");
  const prod = await page.locator("a[href^='/es/products/']").first().getAttribute("href");
  await go(prod);
  check(page.url().includes("/es/products/") && (await page.locator("h1").count()) >= 1, "product page works under /es");
  check((await go("/fr/admin")).status() === 404, "/fr/admin is not a thing");
  const sm = await page.request.get(`${base}/sitemap.xml`);
  const xml = await sm.text();
  check(xml.includes("/fr/shop") && xml.includes("hreflang=\"de\""), "sitemap lists each language with hreflang");

  // Pages that are fixed text should be in the chosen language. A few English words remain on pages that show store content (taglines, product and franchise descriptions) until that is translated by the AI step.
  const pagesToScan = ["/", "/shop", "/franchises", "/gifts", "/search?q=dice", "/cart", "/gift-cards", "/gift-cards/send", "/gift-cards/balance", "/payment-options", "/payment-options/klarna", "/help", "/help/returns", "/help/returns/returns-policy", "/help/contact", "/privacy", "/terms", "/delivery-returns", "/cookies", "/accessibility", "/account/login", "/unsubscribe", "/nonexistent-page-xyz"];
  const english = /\b(the|and|your|you|with|for|our|will|from|are|this|that|have)\b/gi;
  for (const lang of ["fr", "de", "es"]) {
    const noisy = [];
    for (const path of pagesToScan) {
      const resp = await go(`/${lang}${path === "/" ? "" : path}`);
      if (!resp || resp.status() >= 500) { noisy.push(`${path} (status ${resp?.status()})`); continue; }
      const text = await page.locator("body").innerText();
      const hits = (text.match(english) ?? []).length;
      if (hits > 20) noisy.push(`${path} (${hits})`);
    }
    check(noisy.length === 0, `/${lang}: pages are translated (${noisy.join(", ") || "all clean"})`);
  }

  // mobile menu translated
  await page.setViewportSize({ width: 390, height: 800 });
  await go("/de");
  await page.getByRole("button", { name: /Menü/ }).click();
  check(/Favoriten/.test(await page.locator("#mobile-menu").innerText()), "mobile menu is in German");
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), "no sideways scrolling on mobile");
} catch (e) { console.error(e); failed++; }
await browser.close();
process.exit(failed ? 1 : 0);
