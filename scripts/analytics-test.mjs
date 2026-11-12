// Real-browser test of the Analytics page in demo mode (needs the order the checkout test creates).
//   node scripts/analytics-test.mjs 3520
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
try {
  await page.goto(`${base}/admin/analytics`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  check(/Analytics/.test(t) && /Sales by country/.test(t) && /Do customers come back/.test(t), "the page shows its sections");
  check(/United Kingdom|GB/.test(t), "the order's country appears");
  check(/Top customers/.test(t) && /demo@sparkthunder\.shop/.test(t), "top customers lists the buyer");
  await page.getByRole("link", { name: "All time" }).click(); await page.waitForURL(/range=all/);
  check(/Sales value/.test(await page.locator("main").innerText()), "range buttons work");
  check((await page.request.get(`${base}/admin/analytics?range=junk`)).ok(), "a bad range falls back safely");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Analytics journey passed");
process.exit(failed ? 1 : 0);
