// Real-browser test of the Help Centre, in demo mode.
//   node scripts/help-test.mjs 3530
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3530"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const go = async (path) => { await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" }); const r = page.getByRole("button", { name: "Reject all" }); await r.waitFor({ timeout: 3000 }).catch(() => {}); if (await r.isVisible().catch(() => false)) await r.click(); };
const noSideScroll = async () => !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
try {
  await go("/help");
  const t = await page.locator("main").innerText();
  check(/help centre/i.test(t), "help home has its heading");
  check((await page.locator("[data-helpjob]").count()) === 3, "three quick buttons: track, return, replacement");
  check((await page.locator("[data-helpcat]").count()) === 8, "eight section tiles");
  check((await page.locator("[data-helppopular]").count()) >= 6, "popular topics are listed");
  check(await noSideScroll(), "help home: no sideways scrolling");
  check((await page.locator("footer a[href='/help']").count()) >= 1, "the footer links to the Help Centre");

  // search from the home page
  await page.locator("#help-q").fill("cancel order");
  await page.locator("form[role=search] button").click();
  await page.waitForURL(/\/help\/search\?q=cancel/);
  check((await page.locator("[data-helpresult=cancel-my-order]").count()) === 1, "searching 'cancel order' finds the cancel article");
  await page.goto(`${base}/help/search?q=zzzqqqxxx`, { waitUntil: "domcontentloaded" });
  check((await page.locator("[data-help=none]").count()) === 1, "a nonsense search says nothing was found and offers other routes");
  const xss = `<img src=x onerror=window.__x=1>`;
  await page.goto(`${base}/help/search?q=${encodeURIComponent(xss)}`, { waitUntil: "domcontentloaded" });
  check(!(await page.evaluate(() => window.__x)) && (await page.locator("main img[src='x']").count()) === 0, "search text is escaped");

  // category and article
  await go("/help/returns");
  check((await page.locator("[data-helparticle]").count()) >= 4, "the returns section lists its articles");
  await page.locator("[data-helparticle=returns-policy] a").click();
  await page.waitForURL(/\/help\/returns\/returns-policy/);
  const art = await page.locator("main").innerText();
  check(/14 days/.test(art) && /Related articles/i.test(art), "the returns policy article says 14 days and shows related articles");
  check(!/undefined|\[object/i.test(art), "no stray template text in the article");
  await page.locator("main a", { hasText: "Delivery and returns" }).first().click().catch(() => {});
  check(await noSideScroll(), "article: no sideways scrolling");

  // links inside articles go somewhere real
  for (const path of ["/help/orders/where-is-my-order", "/help/shipping/delivery-costs", "/help/payments/what-payment-types-can-i-use", "/help/gift-cards/redeem-a-gift-card", "/help/things-to-know/contact-us"]) {
    const res = await page.request.get(`${base}${path}`);
    check(res.status() === 200, `${path} loads`);
    const hrefs = await (async () => { await go(path); return page.locator("main article a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href"))); })();
    let bad = 0; for (const h of [...new Set(hrefs)].filter((h) => !h.startsWith("/help/contact"))) { const r = await page.request.get(`${base}${h}`); if (r.status() >= 400) { bad++; console.log("  broken:", h, r.status()); } }
    check(bad === 0, `${path}: every link in it works`);
  }
  check((await page.request.get(`${base}/help/nonsense`)).status() === 404, "an unknown section is a 404");
  check((await page.request.get(`${base}/help/returns/nonsense`)).status() === 404, "an unknown article is a 404");
  check((await page.request.get(`${base}/help/orders/returns-policy`)).status() === 404, "an article in the wrong section is a 404");

  // quick buttons go to the right place
  await go("/help");
  await page.locator("[data-helpjob='Return / exchange']").click();
  await page.waitForURL(/how-to-return/);
  check(true, "the Return / exchange button opens the how-to-return article");
  await go("/help");
  await page.locator("[data-helpjob='Request replacement']").click();
  await page.waitForURL(/\/help\/contact\?topic=replacement/);
  const sel = page.locator("select[name=topic]");
  const haveForm = (await sel.count()) === 1;
  if (haveForm) {
    check((await sel.inputValue()).startsWith("Replacement"), "the contact form opens on the replacement topic");
    await page.locator("input[name=name]").fill("Test Shopper"); await page.locator("input[name=email]").fill("shopper@example.com");
    await page.locator("textarea[name=message]").fill("short");
    await page.getByRole("button", { name: "Send message" }).click();
    await page.getByRole("alert").waitFor({ timeout: 10000 });
    check(/more|at least/i.test(await page.getByRole("alert").innerText()), "a too-short message is refused with a plain reason");
    await page.locator("textarea[name=message]").fill("My item arrived with a misprint on the front.");
    await page.getByRole("button", { name: "Send message" }).click();
    const outcome = await Promise.race([page.locator("[data-help=sent]").waitFor({ timeout: 15000 }).then(() => "sent"), page.getByRole("alert").filter({ hasText: /could not|not set up/i }).waitFor({ timeout: 15000 }).then(() => "told")]).catch(() => "nothing");
    check(outcome !== "nothing", `submitting gives a clear result (${outcome}), never silence`);
  } else check(/not set up/i.test(await page.locator("main").innerText()), "with no support email set, the contact page says messages are not set up");
  check(await noSideScroll(), "contact: no sideways scrolling");

  // phone width
  await page.setViewportSize({ width: 390, height: 800 });
  for (const path of ["/help", "/help/orders", "/help/orders/where-is-my-order", "/help/contact"]) { await go(path); check(await noSideScroll(), `${path} fits a phone`); }
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Help Centre journey passed");
process.exit(failed ? 1 : 0);
