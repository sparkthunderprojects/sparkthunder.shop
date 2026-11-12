// Real-browser test of Admin > Domains in demo mode (DNS and HTTPS checks can't succeed here, so the checklist shows "waiting").
//   node scripts/domains-test.mjs 3520
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch(); const page = await browser.newPage();
page.on("dialog", (d) => d.accept());
const D = "journey-test.example.com";
async function remove() {
  await page.goto(`${base}/admin/domains`, { waitUntil: "networkidle" });
  const card = page.locator(`[data-domain="${D}"]`);
  if (await card.count()) { await card.getByRole("button", { name: "Remove" }).click(); await page.getByText("Domain removed.").waitFor(); }
}
try {
  await remove();
  await page.goto(`${base}/admin/domains`, { waitUntil: "networkidle" });
  check(/Add a domain/.test(await page.locator("main").innerText()), "the domains page opens");
  const add = page.getByRole("button", { name: "Add domain" });
  await page.getByPlaceholder("shop.example.com").fill("not a domain");
  check(await add.isDisabled(), "a bad domain can't be added");
  await page.getByPlaceholder("shop.example.com").fill(`https://${D.toUpperCase()}/x`);
  await add.click(); await page.getByText(/Domain added/).waitFor();
  const card = page.locator(`[data-domain="${D}"]`); await card.waitFor();
  check(/At your DNS provider/.test(await card.innerText()), "the new domain shows its set-up steps");
  check(new RegExp(`www\\.${D.replace(/\./g, "\\.")}`).test(await card.innerText()), "it suggests the www version too");
  await page.getByPlaceholder("shop.example.com").fill(D); check(await add.isDisabled() === false, "the add button works again");
  await add.click(); await page.getByText(/already on this store/).waitFor(); check(true, "adding the same domain twice is refused");
  await page.getByRole("button", { name: "Check all domains" }).click();
  await card.getByText("DNS records").waitFor({ timeout: 30000 });
  const txt = await card.innerText();
  check(/The domain has DNS records/.test(txt) && /HTTPS works/.test(txt) && /Shows this store/.test(txt), "the checklist appears");
  check(/Waiting|Problem/.test(txt) && !/Live/.test(txt), "an unconnected domain is not shown as live");
  check((await page.request.get(`${base}/api/store-ping`)).ok(), "the store-ping address answers");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
try { await remove(); } catch (e) { check(false, `cleanup failed: ${e.message.split("\n")[0]}`); }
await browser.close();
console.log(failed ? `${failed} checks failed` : "Domains journey passed");
process.exit(failed ? 1 : 0);
