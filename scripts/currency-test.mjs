// Real-browser test of display currencies in demo mode: add USD in the admin, switch to it as a shopper, check prices convert, the cart explains the charge, and switching back restores pounds.
//   node scripts/currency-test.mjs 3520       (changes the demo store's settings, so run it last)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
try {
  await page.goto(`${base}/admin/commerce`, { waitUntil: "networkidle" });
  while (await page.getByRole("button", { name: "Remove zone" }).count()) await page.getByRole("button", { name: "Remove zone" }).first().click();
  await page.getByLabel("Ships to (country codes)").fill("GB");
  while (await page.getByRole("button", { name: "Remove", exact: true }).count()) await page.getByRole("button", { name: "Remove", exact: true }).first().click(); // the demo store remembers earlier runs
  await page.getByRole("button", { name: "Add a currency" }).click();
  await page.getByPlaceholder("USD").fill("USD"); await page.getByPlaceholder("1.27").fill("1.25");
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await page.getByText("Saved.").first().waitFor();
  check(true, "added USD at 1.25 in the admin");

  await page.goto(`${base}/products/knightverge-crest-tee`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Reject all" }).click().catch(() => {});
  check((await page.locator("main").innerText()).includes("£24.99"), "shoppers start in pounds");
  await page.getByLabel("Show prices in").selectOption("USD");
  await page.waitForFunction(() => /≈US\$31\.24/.test(document.querySelector("main")?.innerText ?? ""));
  check(true, "choosing USD shows ≈US$31.24 (24.99 × 1.25)");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => /≈US\$31\.24/.test(document.querySelector("main")?.innerText ?? ""));
  check(true, "the choice is remembered after reloading");

  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Add to basket", exact: true }).first().click();
  await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => /Subtotal\s+≈US\$31\.24/.test(document.querySelector("main")?.innerText ?? ""));
  const t = await page.locator("main").innerText();
  check(/You will be charged\s+£\d+\.\d\d/.test(t) && /approximate/.test(t), "the basket says you are charged in pounds");

  await page.getByLabel("Show prices in").selectOption("GBP");
  await page.waitForFunction(() => /Subtotal\s+£24\.99/.test(document.querySelector("main")?.innerText ?? ""));
  check(true, "switching back shows pounds again");
  const ld = await (await fetch(`${base}/products/knightverge-crest-tee`)).text();
  check(/"priceCurrency":"GBP"/.test(ld) && !/≈/.test(ld.split("</head>")[0] ?? ""), "search engines still see GBP");

  // Region picker: ship to three countries, add their currencies, then pick a region from the full-screen list.
  await page.goto(`${base}/admin/commerce`, { waitUntil: "networkidle" });
  await page.getByLabel("Ships to (country codes)").fill("GB, IE, US");
  while (await page.getByRole("button", { name: "Remove", exact: true }).count()) await page.getByRole("button", { name: "Remove", exact: true }).first().click();
  await page.getByRole("button", { name: "Add a currency" }).click();
  await page.getByPlaceholder("USD").fill("EUR"); await page.getByPlaceholder("1.27").fill("1.2");
  await page.getByRole("button", { name: "Add a currency" }).click();
  await page.getByPlaceholder("USD").last().fill("USD"); await page.getByPlaceholder("1.27").last().fill("1.25");
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await page.getByText("Saved.").first().waitFor();
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}/products/knightverge-crest-tee`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Reject all" }).click().catch(() => {}); // clearing storage also cleared the cookie choice
  const open = page.locator("footer").getByRole("button", { name: /United Kingdom/ });
  await open.click();
  const dlg = page.getByRole("dialog", { name: "Select your region" });
  const dt = await dlg.innerText();
  check(/Ireland[\s\S]*EUR €/.test(dt) && /United States[\s\S]*USD \$/.test(dt), "the region list shows each country with its currency");
  check((await dlg.locator("img").count()) === 3 && (await page.request.get(`${base}/flags/ie.svg`)).ok(), "each region has a flag image");
  await dlg.getByRole("button", { name: /Ireland/ }).click();
  await page.waitForFunction(() => /≈€29\.99/.test(document.querySelector("main")?.innerText ?? ""));
  check(true, "choosing Ireland shows euro prices");
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Add to basket", exact: true }).first().click();
  await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
  check((await page.getByLabel("Deliver to").inputValue()) === "IE", "the basket delivers to the chosen country");
  // Put the demo store back as it was, so the test can be run again.
  await page.goto(`${base}/admin/commerce`, { waitUntil: "networkidle" });
  await page.getByLabel("Ships to (country codes)").fill("GB");
  while (await page.getByRole("button", { name: "Remove", exact: true }).count()) await page.getByRole("button", { name: "Remove", exact: true }).first().click();
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await page.getByText("Saved.").first().waitFor();
} catch (e) { check(false, `unexpected error: ${e.message.split("\n")[0]}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Currency journey passed");
process.exit(failed ? 1 : 0);
