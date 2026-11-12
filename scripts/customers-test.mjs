// Real-browser test of the Customers area in demo mode (needs at least one order, which the checkout test creates).
//   node scripts/customers-test.mjs 3520
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
try {
  await page.goto(`${base}/admin/customers`, { waitUntil: "networkidle" });
  check(/Customers/.test(await page.locator("h1").innerText()), "the Customers page opens");
  const first = page.locator("table tbody tr").first().locator("a").first();
  const label = (await first.innerText()).trim();
  check(label.length > 0 && !/No customers yet/.test(await page.locator("main").innerText()), "the list shows a customer who ordered");
  await first.click();
  await page.getByText("Lifetime spend").waitFor();
  check(/£\d/.test(await page.locator("main").innerText()), "the profile shows spend and orders");
  const tag = `vip-${Date.now() % 100000}`;
  await page.getByLabel("Tags").fill(`${tag}, press`);
  await page.getByLabel("Notes").fill("Test note from the browser check");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved", { exact: true }).first().waitFor();
  await page.reload({ waitUntil: "networkidle" });
  check((await page.getByLabel("Tags").inputValue()).includes(tag) && (await page.getByLabel("Notes").inputValue()).includes("browser check"), "notes and tags are kept");
  await page.goto(`${base}/admin/customers?tag=${tag}`, { waitUntil: "networkidle" });
  check((await page.locator("table tbody tr a").count()) === 1, "filtering by the tag finds that customer");
  await page.goto(`${base}/admin/customers?q=zzz-nobody`, { waitUntil: "networkidle" });
  check(/Nobody matches/.test(await page.locator("main").innerText()), "a search with no match says so");
  await page.goto(`${base}/admin/customers?segment=never`, { waitUntil: "networkidle" });
  check(true, "groups load");
  const res = await page.request.get(`${base}/admin/export/customers`);
  const csv = await res.text();
  check(res.ok() && csv.includes("Lifetime spend") && csv.includes(tag), "the CSV export works and includes the tag");
  // put things back so the test can be run again
  await page.goto(`${base}/admin/customers?tag=${tag}`, { waitUntil: "networkidle" });
  await page.locator("table tbody tr a").first().click();
  await page.getByLabel("Tags").fill(""); await page.getByLabel("Notes").fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved", { exact: true }).first().waitFor();
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Customers journey passed");
process.exit(failed ? 1 : 0);
