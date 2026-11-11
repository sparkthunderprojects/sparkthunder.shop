// Real-browser test of the buying journey in demo mode: choose a size, add to basket, change quantity, check the maths,
// check out, see the confirmation, and find the order in the admin. Run against a started demo server:
//   node scripts/checkout-test.mjs 3480
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3480"}`;
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
const text = async () => page.locator("main").innerText();
try {
  await page.goto(`${base}/products/knightverge-crest-tee`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Reject all" }).click().catch(() => {});
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Add to basket", exact: true }).first().click();
  await page.waitForFunction(() => /knightverge-crest-tee::M/.test(localStorage.getItem("sparkthunder-cart-v1") ?? ""));
  check(true, "chose a size and added to the basket");

  await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
  let t = await text();
  check(/Crest T-Shirt - M/.test(t) && /Subtotal\s+£24\.99/.test(t), "basket shows the item at £24.99");
  const qty = page.getByLabel(/Quantity for/);
  await qty.fill("2"); await qty.blur();
  await page.waitForFunction(() => /Subtotal\s+£49\.98/.test(document.querySelector("main")?.innerText ?? ""));
  t = await text();
  check(/Subtotal\s+£49\.98/.test(t), "quantity 2 gives £49.98");
  const total = Number((t.match(/Estimated total\s+£([\d.]+)/) ?? [])[1]), ship = Number((t.match(/Delivery\s+£([\d.]+)/) ?? [])[1]);
  check(Math.abs(total - (49.98 + ship)) < 0.005, `total £${total} = subtotal + delivery £${ship}`);

  await page.getByRole("button", { name: "Remove" }).click();
  await page.waitForFunction(() => /basket is empty/i.test(document.querySelector("main")?.innerText ?? ""));
  check(true, "removing the item empties the basket");

  await page.goto(`${base}/products/knightverge-crest-tee`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "L", exact: true }).click();
  await page.getByRole("button", { name: "Add to basket", exact: true }).first().click();
  await page.waitForFunction(() => /::L/.test(localStorage.getItem("sparkthunder-cart-v1") ?? ""));
  await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.waitForURL(/\/checkout\/success/, { timeout: 20000 });
  const done = await page.locator("body").innerText();
  const order = (done.match(/order (\S+) is confirmed/) ?? [])[1];
  check(!!order, `checkout completed, order ${order}`);
  const left = await page.evaluate(() => localStorage.getItem("sparkthunder-cart-v1"));
  check(!left || left === "[]", "basket is empty after paying");

  await page.goto(`${base}/admin/orders`, { waitUntil: "networkidle" });
  check(order ? (await page.locator("body").innerText()).includes(order) : false, "the order appears in the admin");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n")[0]}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Checkout journey passed");
process.exit(failed ? 1 : 0);
