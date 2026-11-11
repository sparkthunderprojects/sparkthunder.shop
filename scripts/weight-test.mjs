// Real-browser test of delivery priced by weight in demo mode: set a weight-banded zone in the admin, check the basket's delivery changes with what is in it, then put the settings back.
//   node scripts/weight-test.mjs 3530
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3530"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
const save = async () => { await page.getByRole("button", { name: "Save", exact: true }).first().click(); await page.getByText("Saved.").first().waitFor(); };
const clearZones = async () => { while (await page.getByRole("button", { name: "Remove zone" }).count()) await page.getByRole("button", { name: "Remove zone" }).first().click(); };
const delivery = async () => (await page.locator("main").innerText()).match(/Delivery[^\n]*\n(£[\d.]+|Free)/)?.[1];
try {
  await page.goto(`${base}/admin/commerce`, { waitUntil: "networkidle" });
  await clearZones();
  await page.getByRole("button", { name: "Add a delivery zone" }).click();
  await page.getByPlaceholder("United Kingdom").fill("UK");
  await page.getByLabel("Country codes").fill("GB");
  await page.getByLabel("Charge by").selectOption("weight");
  await page.getByLabel("Weight bands").fill("500=3.50, 1000=4.50, 2000=6.00");
  await page.getByLabel("Default weight of one item (grams)").fill("400");
  await save();
  check(true, "saved a UK zone priced by weight (400 g per item)");

  await page.goto(`${base}/products/knightverge-crest-tee`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Reject all" }).click().catch(() => {});
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Add to basket", exact: true }).first().click();
  await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => /Delivery[^\n]*\n£3\.50/.test(document.querySelector("main")?.innerText ?? ""));
  check(await delivery() === "£3.50", "one item (400 g) pays the first band, £3.50");
  const qty = page.getByLabel(/Quantity for/); await qty.fill("2"); await qty.blur();
  await page.waitForFunction(() => /Delivery[^\n]*\n£4\.50/.test(document.querySelector("main")?.innerText ?? ""));
  check(await delivery() === "£4.50", "two items (800 g) pay the second band, £4.50");
  await qty.fill("6"); await qty.blur();
  await page.waitForFunction(() => /Delivery[^\n]*\n£(6\.00|\d+\.\d\d)/.test(document.querySelector("main")?.innerText ?? "") && !/\n£4\.50/.test(document.querySelector("main")?.innerText ?? ""));
  check(["£6.00", "£8.00"].includes(await delivery()), `six items (2400 g) pay more still: ${await delivery()}`);
  const policy = await (await fetch(`${base}/delivery-returns`)).text();
  check(/by the weight of your order/.test(policy), "the delivery page explains weight pricing");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n")[0]}`); }
try { await page.goto(`${base}/admin/commerce`, { waitUntil: "networkidle" }); await clearZones(); await save(); } catch { /* best effort */ }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Weight delivery journey passed");
process.exit(failed ? 1 : 0);
