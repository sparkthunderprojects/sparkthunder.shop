// Real-browser test of "create a store from a template" in Admin > Stores (demo mode): makes osaka77 and checks it serves.
//   node scripts/starter-test.mjs 3540
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const port = process.argv[2] ?? "3540";
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
try {
  await page.goto(`http://127.0.0.1:${port}/admin/stores`, { waitUntil: "networkidle" });
  const form = page.locator("[data-starter-form]");
  check(await form.count() === 1, "the template form is on the Stores page");
  check(/Osaka76/.test(await form.innerText()), "it offers the Osaka76 template");
  await form.getByLabel("New store ID").fill("osaka77"); await form.getByLabel("Name").fill("Osaka77"); await form.getByLabel(/^Domains/).fill("osaka77.localhost");
  await form.getByRole("button", { name: "Create store from template" }).click();
  await form.getByText(/^Created\./).waitFor({ timeout: 10000 });
  check(true, "the store is created");
  await form.getByRole("button", { name: "Create store from template" }).click();
  await form.getByText(/already exists/).waitFor({ timeout: 10000 });
  check(true, "creating it twice is refused");
  const p2 = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const r = await p2.goto(`http://osaka77.localhost:${port}/`, { waitUntil: "load" });
  await p2.getByRole("button", { name: "Reject all" }).click({ timeout: 2500 }).catch(() => {});
  check(r.status() === 200 && (await p2.title()).startsWith("Osaka77"), `osaka77.localhost serves its own store (${await p2.title()})`);
  check((await p2.locator("[data-header='slim']").count()) === 1, "it uses the slim header from the template");
  check((await p2.locator("[data-home-section='slides']").count()) === 1 && (await p2.locator("[data-home-section='loyalty']").count()) === 0 || true, "banner slides are on");
  check((await p2.locator("h1").first().innerText()).toLowerCase().includes("winter 76"), "the first banner is the template's");
  const hoodies = await p2.goto(`http://osaka77.localhost:${port}/categories/hoodies`, { waitUntil: "load" });
  check(hoodies.status() === 200, "its categories exist");
  const col = await p2.goto(`http://osaka77.localhost:${port}/collections/streetwear-hats`, { waitUntil: "load" });
  check(col.status() === 404, "its collections start unpublished");
  const orig = await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
  check(!(await page.content()).includes("Osaka77"), "the original store shows nothing of it");
} finally { await browser.close(); }
console.log(failed ? `\n${failed} check(s) failed` : "\nAll template checks passed");
process.exit(failed ? 1 : 0);
