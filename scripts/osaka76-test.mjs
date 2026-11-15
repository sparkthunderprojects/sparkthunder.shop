// Real-browser test of the Osaka76 demo store (streetwear theme: banner slides, members club, sizes), on osaka76.localhost.
//   node scripts/osaka76-test.mjs 3540
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import http from "node:http";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const port = process.argv[2] ?? "3540";
const base = `http://osaka76.localhost:${port}`;
let failed = 0; const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failed++; };
const browser = await chromium.launch();
try {
  for (const [name, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await (await browser.newContext({ viewport: vp })).newPage();
    const errs = []; page.on("pageerror", (e) => errs.push(e.message));
    const r = await page.goto(`${base}/`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Reject all" }).click({ timeout: 2500 }).catch(() => {});
    check(r.status() === 200, `${name}: home loads`);
    check((await page.title()).startsWith("Osaka76"), `${name}: title is Osaka76`);
    check((await page.locator("h1").count()) === 1, `${name}: exactly one h1`);
    const sections = await page.evaluate(() => [...document.querySelectorAll("[data-home-section]")].map((e) => e.getAttribute("data-home-section")));
    check(sections.join() === "slides,new,categories,loyalty,featured,story", `${name}: banner slides, new, categories, members club, featured, story (got ${sections.join()})`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no sideways scrolling`);
    check((await page.getByText("Members Club").count()) > 0, `${name}: members club banner shown`);
    check(errs.length === 0, `${name}: no page errors ${errs[0] ?? ""}`);
  }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(`${base}/products/shibuya-heavyweight-hoodie`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Reject all" }).click({ timeout: 2500 }).catch(() => {});
  check((await page.getByText("Size", { exact: true }).count()) > 0, "product page offers sizes");
  const shop = await page.goto(`${base}/shop`, { waitUntil: "load" });
  check(shop.status() === 200 && (await page.locator("a[href^='/products/']").count()) >= 13, "shop lists the 13 products");
  const body = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  check(!body.includes("Osaka76") && !body.includes("Winter 76"), "the original store shows nothing from Osaka76");
  // fetch() will not let us set the Host header, so use http directly.
  const sm = await new Promise((res, rej) => http.get({ host: "127.0.0.1", port, path: "/sitemap.xml", headers: { Host: `osaka76.localhost:${port}` } }, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(d)); }).on("error", rej));
  check(sm.includes("osaka76-beanie") && !sm.includes("velvet-tint"), "Osaka76 sitemap is its own");
} finally { await browser.close(); }
console.log(failed ? `\n${failed} check(s) failed` : "\nAll Osaka76 checks passed");
process.exit(failed ? 1 : 0);
