// Real-browser test of the "ways to pay" pages (PayPal, Klarna, Clearpay), in demo mode.
//   node scripts/pay-later-test.mjs 3520
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const eventually = async (fn, ms = 20000) => { const t = Date.now(); for (;;) { try { if (await fn()) return true; } catch {} if (Date.now() - t > ms) return false; await new Promise((r) => setTimeout(r, 700)); } };
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const setBoxes = async (on) => {
  await page.goto(`${base}/admin/commerce`, { waitUntil: "networkidle" });
  for (const n of ["PayPal", "Klarna", "Clearpay"]) { const c = page.getByLabel(`Show the ${n} page`); on ? await c.check() : await c.uncheck(); }
  await page.getByRole("button", { name: /^Save/ }).first().click(); await page.getByText(/saved/i).first().waitFor({ timeout: 15000 });
};
try {
  // off by default or after a reset: the pages do not exist
  await setBoxes(false);
  const off = await eventually(async () => (await page.request.get(`${base}/payment-options/klarna`)).status() === 404);
  check(off, "a page is a 404 while it is switched off");
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  check((await page.locator("footer a[href='/payment-options']", { hasText: "Payment options" }).count()) >= 1, "the footer always links to Payment options, even with every method off");
  await setBoxes(true);
  const on = await eventually(async () => (await page.request.get(`${base}/payment-options/klarna`)).status() === 200);
  check(on, "switching it on makes the page appear");
  for (const [slug, name] of [["paypal", "PayPal"], ["klarna", "Klarna"], ["clearpay", "Clearpay"]]) {
    await page.goto(`${base}/payment-options/${slug}`, { waitUntil: "networkidle" });
    const reject = page.getByRole("button", { name: "Reject all" }); if (await reject.isVisible().catch(() => false)) await reject.click();
    const t = await page.locator("main").innerText();
    check(new RegExp(`Pay with ${name}`).test(t), `${name}: banner says Pay with ${name}`);
    check((await page.locator(`[data-paymethod=${slug}] img`).count()) >= 2, `${name}: logo and product pictures show`);
    check(/Subject to status/.test(await page.locator("[data-smallprint]").innerText()), `${name}: small print is shown`);
    check((await page.locator("main details").count()) >= 3, `${name}: has its questions`);
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${name}: no sideways scrolling`);
  }
  // klarna must not be described as split into 4
  await page.goto(`${base}/payment-options/klarna`, { waitUntil: "networkidle" });
  check(!/split into 4|pay in 4/i.test(await page.locator("main").innerText()), "Klarna page does not claim pay in 4 (not offered in the UK)");
  // calculator
  const clear = `${base}/payment-options/clearpay`;
  await page.goto(clear, { waitUntil: "networkidle" });
  await page.locator("#paycalc-amount").fill("100");
  const parts = await page.locator("[data-paycalc-part]").allInnerTexts();
  check(parts.length === 4 && parts.every((p) => p.trim() === "£25.00"), `Clearpay splits £100 into four £25.00 payments (${parts.join(", ")})`);
  await page.goto(`${base}/payment-options/klarna`, { waitUntil: "domcontentloaded" });
  await page.locator("#paycalc-amount").waitFor(); await page.waitForTimeout(800);
  await page.locator("#paycalc-amount").fill("10");
  const k = (await page.locator("[data-paycalc-part]").allInnerTexts()).map((s) => s.trim());
  check(k.length === 3 && k[0] === "£3.34" && k[1] === "£3.33", `Klarna splits £10 into 3 payments (${k.join(", ")})`);
  // hub and footer
  await page.goto(`${base}/payment-options`, { waitUntil: "networkidle" });
  check((await page.locator("[data-payoption]").count()) === 3, "the Payment options page lists the three methods");
  check((await page.locator("footer a", { hasText: "Payment options" }).count()) >= 1, "the footer links to Payment options");
  await page.goto(`${base}/payment-options/nonsense`); check((await page.locator("body").innerText()).length > 0 && (await page.request.get(`${base}/payment-options/nonsense`)).status() === 404, "an unknown method is a 404");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
try { await setBoxes(false); } catch {}
await browser.close();
console.log(failed ? `${failed} checks failed` : "Pay later pages journey passed");
process.exit(failed ? 1 : 0);
