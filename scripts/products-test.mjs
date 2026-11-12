// Real-browser test of Duplicate product and smart (rule-based) collections in demo mode.
//   node scripts/products-test.mjs 3520
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
page.on("dialog", (d) => d.accept());
let copyUrl = null;
try {
  // duplicate
  await page.goto(`${base}/admin/products`, { waitUntil: "networkidle" });
  const href = await page.locator("a[href^='/admin/products/']:not([href$='/new']):not([href$='/import'])").first().getAttribute("href");
  await page.goto(`${base}${href}`, { waitUntil: "networkidle" });
  const original = await page.locator("h1").innerText();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await page.waitForURL((u) => /-copy/.test(u.pathname) && u.pathname !== href, { timeout: 15000 });
  copyUrl = new URL(page.url()).pathname;
  await page.locator("h1").filter({ hasText: "(copy)" }).waitFor();
  check((await page.locator("h1").innerText()).includes(original), "the copy opens with the original's name plus (copy)");
  check(/Draft/.test(await page.locator(".adm-h").innerText()), "the copy is a draft");
  const slug = copyUrl.split("/").pop();
  const live = await page.request.get(`${base}/products/${slug}`, { maxRedirects: 0 });
  // (an earlier run's deleted copy leaves a redirect behind, which is also "not on the shop")
  check([404, 301, 307, 308].includes(live.status()), `the draft copy is not on the shop (status ${live.status()}, ${slug})`);

  // smart collection
  await page.goto(`${base}/admin/collections`, { waitUntil: "networkidle" });
  await page.locator("label").filter({ hasText: /^Name/ }).locator("input").fill("Auto test collection");
  await page.getByLabel("Fill this collection automatically with rules").check();
  const sel = page.getByLabel("Rule 1 value"); await sel.selectOption({ index: 1 });
  await page.getByText(/products? match(es)? right now/).waitFor();
  const n = Number((await page.getByRole("status").filter({ hasText: /right now/ }).locator("b").innerText()).trim());
  check(n >= 1, "the live preview counts matching products");
  await page.getByRole("button", { name: "Create collection" }).click(); await page.getByText("Collection saved").waitFor();
  check(await page.locator("table").getByText("Automatic").waitFor({ timeout: 10000 }).then(() => true, () => false), "the collection is listed as automatic");
  let ok = false;
  for (let i = 0; i < 5 && !ok; i++) { await page.goto(`${base}/collections/auto-test-collection`, { waitUntil: "networkidle" }); ok = (await page.locator("a[href^='/products/']").count()) >= 1; }
  check(ok, "the shop's collection page shows the matching products");

  // switching rules off
  await page.goto(`${base}/admin/collections`, { waitUntil: "networkidle" });
  await page.locator("tr", { hasText: "Auto test collection" }).getByRole("button", { name: "Edit" }).click();
  check(await page.getByLabel("Fill this collection automatically with rules").isChecked(), "editing shows the saved rules");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
// clean up
try {
  await page.goto(`${base}/admin/collections`, { waitUntil: "networkidle" });
  const row = page.locator("tr", { hasText: "Auto test collection" });
  if (await row.count()) { await row.getByRole("button", { name: "Delete" }).click(); await page.getByText("Collection deleted").waitFor(); }
  if (copyUrl) { await page.goto(`${base}${copyUrl}`, { waitUntil: "networkidle" }); await page.getByRole("button", { name: "Delete product" }).click(); await page.waitForURL(/\/admin\/products$/, { timeout: 15000 }); }
} catch (e) { check(false, `cleanup failed: ${e.message.split("\n")[0]}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Products journey passed");
process.exit(failed ? 1 : 0);
