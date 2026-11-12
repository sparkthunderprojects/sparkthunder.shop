// Real-browser test of Admin > Characters, trimmed portraits and the Shop by character carousels, in demo mode.
//   node scripts/characters-test.mjs 3520 /path/to/portrait.png
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3520"}`;
const portrait = process.argv[3];
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const eventually = async (fn, ms = 20000) => { const t = Date.now(); for (;;) { try { if (await fn()) return true; } catch {} if (Date.now() - t > ms) return false; await new Promise((r) => setTimeout(r, 700)); } };
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("dialog", (d) => d.accept());
let slug = "test-hero"; let productHref = null; let oldTags = null;
try {
  // 1. tag a product with the character
  await page.goto(`${base}/admin/products`, { waitUntil: "networkidle" });
  productHref = await page.locator("a[href^='/admin/products/']:not([href$='/new']):not([href$='/import'])").first().getAttribute("href");
  await page.goto(`${base}${productHref}`, { waitUntil: "networkidle" });
  const tagBox = page.locator("label").filter({ hasText: /^Tags/ }).locator("input");
  oldTags = await tagBox.inputValue();
  await tagBox.fill(`${oldTags ? oldTags + ", " : ""}character:${slug}`);
  await page.getByRole("button", { name: /^Save/ }).first().click(); await page.getByText(/saved/i).first().waitFor({ timeout: 15000 });

  // 2. set the character up with a portrait
  await page.goto(`${base}/admin/characters`, { waitUntil: "networkidle" });
  check(/Characters/.test(await page.locator("h1").innerText()), "the Characters screen opens");
  check((await page.locator(`[data-character-row='${slug}']`).count()) === 1, "a character that only exists as a product tag is listed");
  const row = page.locator(`[data-character-row='${slug}']`);
  await row.getByRole("button", { name: /Choose a portrait/ }).click();
  if (portrait) {
    await page.locator(".adm-modal input[type=file]").setInputFiles(portrait);
    await page.locator(".adm-mitem").first().waitFor({ timeout: 30000 });
    const src = await page.locator(".adm-mitem img").first().getAttribute("src");
    let dims = [0, 0];
    try { const sharp = require(require("node:path").join(process.cwd(), "node_modules", "sharp")); const m = await sharp(require("node:path").join(process.cwd(), "public", src)).metadata(); dims = [m.width, m.height]; } catch (e) { console.log("(could not read the saved file:", e.message, ")"); }
    check(dims[0] > 0 && dims[0] < dims[1], `the portrait was trimmed to the figure (${dims[0]}x${dims[1]} from 7000x3850)`);
    await page.locator(".adm-mitem").first().click();
  } else if (await page.locator(".adm-mitem").count()) { await page.locator(".adm-mitem").first().click(); }
  else { await page.getByRole("button", { name: "Close", exact: true }).click(); }
  await row.getByLabel("Name").fill("Test Hero");
  await row.getByLabel(/Show on the home page/).check();
  await page.getByRole("button", { name: "Save characters" }).click(); await page.getByText("Characters saved").waitFor();

  // 3. shoppers see it
  const seen = await eventually(async () => { await page.goto(`${base}/`, { waitUntil: "networkidle" }); return (await page.locator("[data-characters='home-characters'] [data-character]").count()) > 0; });
  check(seen, "the home page shows a Shop by character carousel");
  const tile = page.locator(`[data-characters='home-characters'] [data-character='${slug}']`);
  check(/Test Hero/i.test(await tile.innerText()), "the tile shows the character's name");
  if (portrait) check((await tile.locator("img").count()) === 1, "the tile shows the portrait");
  const reject = page.getByRole("button", { name: "Reject all" }); if (await reject.isVisible().catch(() => false)) await reject.click();
  await tile.click(); await page.waitForURL(new RegExp(`/characters/${slug}`));
  check(/Test Hero/.test(await page.locator("h1").innerText()), "the character page opens");
  check((await page.locator(".pcard, [data-product]").count()) + (await page.locator("a[href^='/products/']").count()) > 0, "the character page lists the tagged product");
  await page.goto(`${base}/characters`, { waitUntil: "networkidle" });
  check((await page.locator(`.char-grid [data-character='${slug}']`).count()) === 1, "the all-characters page lists it");
  // franchise page
  const fr = await (async () => { await page.goto(`${base}/characters/${slug}`, { waitUntil: "networkidle" }); const a = page.locator("a", { hasText: /^More from/ }); return (await a.count()) ? await a.getAttribute("href") : null; })();
  if (fr) { await page.goto(`${base}${fr}`, { waitUntil: "networkidle" }); check((await page.locator("[data-characters='franchise-characters'] [data-character]").count()) >= 1, "the franchise page has its own characters carousel"); }
  else check(false, "the character page links to its franchise");
} catch (e) { check(false, `unexpected error: ${e.message.split("\n").slice(0, 3).join(" | ")}`); }
// clean up so reruns start fresh (set KEEP=1 to leave the test data for a look)
if (!process.env.KEEP)
try {
  await page.goto(`${base}/admin/characters`, { waitUntil: "networkidle" });
  const row = page.locator(`[data-character-row='${slug}']`);
  if (await row.count()) { await row.getByRole("button", { name: "Remove", exact: true }).last().click(); await page.getByRole("button", { name: "Save characters" }).click(); await page.getByText("Characters saved").waitFor(); }
  if (productHref && oldTags !== null) { await page.goto(`${base}${productHref}`, { waitUntil: "networkidle" }); await page.locator("label").filter({ hasText: /^Tags/ }).locator("input").fill(oldTags); await page.getByRole("button", { name: /^Save/ }).first().click(); await page.getByText(/saved/i).first().waitFor({ timeout: 15000 }); }
} catch {}
await browser.close();
console.log(failed ? `${failed} checks failed` : "Characters journey passed");
process.exit(failed ? 1 : 0);
