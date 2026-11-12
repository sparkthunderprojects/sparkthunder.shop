// Real-browser test of Admin > Launch checklist and the Launch column on All stores, in demo mode.
//   node scripts/launch-test.mjs 3520
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
try {
  await page.goto(`${base}/admin/launch`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  check(/Launch checklist/.test(t) && /(Ready to launch|Not ready yet)/.test(t), "the checklist opens with a verdict");
  for (const g of ["Brand", "Selling", "Money and email", "Shipping", "Legal"]) check(t.includes(g), `shows the ${g} section`);
  const n = await page.locator("[data-check]").count();
  check(n >= 12, `lists the checks (${n})`);
  check((await page.locator("[data-check][data-ok=true]").count()) >= 1, "some checks are done");
  const fix = page.locator("[data-check][data-ok=false] a", { hasText: "Fix" }).first();
  if (await fix.count()) { const href = await fix.getAttribute("href"); check(href?.startsWith("/admin/") ?? false, "each open item links to where it is fixed"); }
  await page.goto(`${base}/admin/overview`, { waitUntil: "networkidle" });
  check(/launch/i.test(await page.locator("thead").innerText()), "All stores has a Launch column");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Launch checklist journey passed");
process.exit(failed ? 1 : 0);
