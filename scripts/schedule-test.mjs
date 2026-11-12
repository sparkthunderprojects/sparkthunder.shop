// Real-browser test of scheduled changes in demo mode: schedule a short sale, apply it from the admin, see the sale price in the shop, then see prices go back when it ends.
//   node scripts/schedule-test.mjs 3520       (takes about a minute: it waits for the sale's one-minute window to close)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
// The product's own price, from its structured data (other products on the page have prices of their own).
const price = async () => { await page.goto(`${base}/products/knightverge-crest-tee`, { waitUntil: "networkidle" }); return /"price":"?([0-9.]+)/.exec(await page.content())?.[1]; };
const shopHas = async (want, tries = 8) => { for (let i = 0; i < tries; i++) { if ((await price()) === want) return true; await page.waitForTimeout(1500); } return false; };
const field = (name) => page.locator("label").filter({ hasText: new RegExp("^" + name) }).locator("select, input");
const apply = async () => { await page.goto(`${base}/admin/schedule`, { waitUntil: "networkidle" }); await page.getByRole("button", { name: "Apply anything due now" }).click(); await page.getByText(/Applied anything that was due|Something went wrong/).first().waitFor(); };
try {
  await page.goto(`${base}/admin/schedule`, { waitUntil: "networkidle" });
  const [start, end] = await page.evaluate(() => {
    const d = new Date(); d.setSeconds(0, 0); const f = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return [f(d), f(new Date(d.getTime() + 60000))];
  });
  await field("What").selectOption({ label: "Run a sale on a product" });
  await field("Product").selectOption({ label: "Knightverge Crest T-Shirt" });
  await field("Percent off").fill("20");
  await field("Starts").fill(start); await field("Ends").fill(end);
  await page.getByRole("button", { name: "Schedule it" }).click();
  await page.getByText("Scheduled", { exact: true }).first().waitFor();
  check(true, "scheduled a 20% sale with a one-minute window");


  await apply();
  check(await shopHas("19.99"), "the shop shows the sale price £19.99");
  check(/£24\.99/.test(await page.locator("main").innerText()), "and the old price £24.99 as the was-price");

  const deadline = Date.now() + 120000; let back = false;
  while (Date.now() < deadline && !back) { await page.waitForTimeout(5000); await apply(); back = await shopHas("24.99", 1); }
  check(back, "after the end time the price goes back to £24.99");

  await page.goto(`${base}/admin/schedule`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  check(/Sale ended, prices restored/.test(t), "the list records that the sale ended");

  // cancel a change that has not started
  const far = await page.evaluate(() => { const d = new Date(Date.now() + 7 * 86400000); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); });
  await field("What").selectOption({ label: "Hide a product" });
  await field("Product").selectOption({ label: "Knightverge Crest T-Shirt" });
  await field("Starts").fill(far);
  await page.getByRole("button", { name: "Schedule it" }).click();
  await page.getByText("Scheduled", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).first().click();
  await page.getByText("Cancelled", { exact: true }).first().waitFor();
  check(true, "a waiting change can be cancelled");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0,3).join(" | ")} @ ${(e.stack.match(/schedule-test.mjs:\d+/)||[""])[0]}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Scheduled changes journey passed");
process.exit(failed ? 1 : 0);
