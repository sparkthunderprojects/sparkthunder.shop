// Real-browser test of per-store theme layouts in demo mode: choose layouts and presets in Admin, see them on the shop, then restore.
//   node scripts/theme-test.mjs 3520
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
page.on("dialog", (d) => d.accept());
const field = (label) => page.locator("label").filter({ hasText: new RegExp(`^${label}`) }).locator("select, input, textarea");
// The first request after a save can still serve the previous copy, so look a few times.
async function eventually(url, fn) { for (let i = 0; i < 5; i++) { await page.goto(url, { waitUntil: "networkidle" }); if (await fn()) return true; } return false; }
async function reset() {
  await page.goto(`${base}/admin/theme`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Apply Classic" }).click(); await page.getByText("Applied Classic.").waitFor();
}
try {
  await reset();
  await page.goto(`${base}/admin/theme`, { waitUntil: "networkidle" });
  check(/Start from a preset/.test(await page.locator("main").innerText()), "the theme page opens");

  await field("Header").selectOption("compact"); await field("Product cards").selectOption("soft");
  await field("Product page").selectOption("stacked"); await field("Footer").selectOption("compact");
  await page.getByRole("button", { name: "Save layout" }).click(); await page.getByText(/Saved\. The shop now uses this layout/).waitFor();

  check(await eventually(`${base}/`, async () => (await page.locator("header[data-header=compact]").count()) === 1), "the compact header shows");
  check((await page.locator("header nav[aria-label=Primary] a").count()) >= 2, "the compact header has links");
  check((await page.locator("footer[data-footer=compact]").count()) === 1, "the compact footer shows");
  check((await page.locator("html").getAttribute("data-card")) === "soft", "the card style is set on the page");
  await page.goto(`${base}/shop`, { waitUntil: "networkidle" });
  const href = await page.locator("a[href^='/products/']").first().getAttribute("href");
  await page.goto(`${base}${href}`, { waitUntil: "networkidle" });
  check((await page.locator("[data-pdp=stacked]").count()) === 1, "the stacked product page shows");
  check((await page.getByRole("button", { name: /add to (basket|bag|cart)/i }).count()) >= 1, "the product page still has its buy button");

  // a preset changes colours too
  await page.goto(`${base}/admin/theme`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Apply Dark and bold" }).click(); await page.getByText("Applied Dark and bold.").waitFor();
  check(await eventually(`${base}/`, async () => (await page.locator("html").getAttribute("style"))?.includes("#7cff4d")), "a preset changes the shop's colours");
  check((await page.locator("html").getAttribute("data-card")) === "minimal", "a preset changes the layout too");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
try { await reset(); await page.goto(`${base}/admin/theme`, { waitUntil: "networkidle" }); await field("Header").selectOption("classic"); await field("Product cards").selectOption("bordered"); await field("Product page").selectOption("split"); await field("Footer").selectOption("full"); await page.getByRole("button", { name: "Save layout" }).click(); await page.getByText(/Saved\./).waitFor(); } catch (e) { check(false, `could not restore: ${e.message.split("\n")[0]}`); }
check(await eventually(`${base}/`, async () => (await page.locator("header[data-header=compact]").count()) === 0 && (await page.locator("html").getAttribute("data-card")) === "bordered"), "the original layout is restored");
await browser.close();
console.log(failed ? `${failed} checks failed` : "Theme journey passed");
process.exit(failed ? 1 : 0);
