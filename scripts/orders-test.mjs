// Real-browser test of order search, filters, invoices and packing slips in demo mode (needs one order, which the checkout test creates).
//   node scripts/orders-test.mjs 3520
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const ctx = await browser.newContext(); const page = await ctx.newPage();
const rows = () => page.locator("table tbody tr:has(input[name=id])");
try {
  await page.goto(`${base}/admin/orders`, { waitUntil: "networkidle" });
  const n = await rows().count();
  check(n >= 1, "the list shows orders");
  const number = (await rows().first().locator("a").first().innerText()).trim();

  await page.goto(`${base}/admin/orders?q=${encodeURIComponent(number.toLowerCase())}`, { waitUntil: "networkidle" });
  check((await rows().count()) >= 1 && (await rows().first().innerText()).includes(number), "searching by order number finds it");
  await page.goto(`${base}/admin/orders?q=zzz-no-such-order`, { waitUntil: "networkidle" });
  check(/No orders match/.test(await page.locator("main").innerText()), "a search with no match says so");
  await page.goto(`${base}/admin/orders?status=cancelled`, { waitUntil: "networkidle" });
  check(/No orders match/.test(await page.locator("main").innerText()) || (await rows().count()) === 0 || /Cancelled/.test(await rows().first().innerText()), "the status filter works");
  await page.goto(`${base}/admin/orders?from=2999-01-01`, { waitUntil: "networkidle" });
  check((await rows().count()) === 0, "a date range in the future shows nothing");

  // the filter form itself
  await page.goto(`${base}/admin/orders`, { waitUntil: "networkidle" });
  await page.getByPlaceholder(/Order number, name/).fill(number);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL(/q=/);
  check((await rows().count()) >= 1, "the search box and button work");

  // bulk print: tick the order, press the button, a new tab opens with the slip
  const [slip] = await Promise.all([ctx.waitForEvent("page"), (async () => { await rows().first().locator("input[name=id]").check(); await page.getByRole("button", { name: "Print packing slips" }).click(); })()]);
  await slip.waitForLoadState("networkidle");
  const st = await slip.locator("body").innerText();
  check(/Packing slip/.test(st) && st.includes(number) && /Deliver to/i.test(st), "the packing slip shows the order and address");
  check(!/£\d/.test(st), "the packing slip shows no prices");
  const [inv] = await Promise.all([ctx.waitForEvent("page"), (async () => { await page.getByRole("button", { name: "Print invoices" }).click(); })()]);
  await inv.waitForLoadState("networkidle");
  const it = await inv.locator("body").innerText();
  check(/Invoice/.test(it) && it.includes(number) && /Bill to/i.test(it) && /£\d/.test(it) && /Total/.test(it), "the invoice shows lines, prices and a total");

  // single-order buttons
  await page.goto(`${base}/admin/orders`, { waitUntil: "networkidle" });
  await rows().first().locator("a").first().click();
  await page.getByRole("link", { name: "Print invoice" }).waitFor();
  check((await page.getByRole("link", { name: "Print packing slip" }).getAttribute("href")).includes("kind=packing"), "the order page has print links");
  const empty = await page.request.get(`${base}/admin/print?kind=invoice`);
  check(empty.ok() && /No orders to print/.test(await empty.text()), "printing with nothing selected says so");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Orders journey passed");
process.exit(failed ? 1 : 0);
