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
    check(sections.join() === "split,new,categories,loyalty,featured,story", `${name}: split banner, new, categories, members club, featured, story (got ${sections.join()})`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no sideways scrolling`);
    check((await page.getByText("Members Club").count()) > 0, `${name}: members club banner shown`);
    check(errs.length === 0, `${name}: no page errors ${errs[0] ?? ""}`);
  }
  // Home page: the split banner fills the first screen (two panels side by side) with the header floating over it, as on the reference.
  {
    const wide = await (await browser.newContext({ viewport: { width: 1920, height: 945 } })).newPage();
    await wide.goto(`${base}/`, { waitUntil: "load" });
    await wide.getByRole("button", { name: "Reject all" }).click({ timeout: 2500 }).catch(() => {});
    await wide.waitForTimeout(400);
    const m = await wide.evaluate(() => {
      const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y + scrollY), Math.round(b.width), Math.round(b.height)]; };
      const panels = [...document.querySelectorAll("[data-home-split] section")].map(r);
      const h = document.querySelector("[data-header='slim']");
      return { panels, header: r(h), bg: getComputedStyle(h).backgroundColor, solid: h.hasAttribute("data-solid") };
    });
    check(m.panels.length === 2 && m.panels[0].join() === "0,0,960,945" && m.panels[1].join() === "960,0,960,945", `split banner: two panels of 960 x 945 filling the first screen (${m.panels.map((p) => p.join(",")).join(" | ")})`);
    check(m.header.join() === "0,0,1920,46" && m.bg === "rgba(0, 0, 0, 0)" && !m.solid, `header floats transparent over the banner (${m.header.join(",")} ${m.bg})`);
    await wide.evaluate(() => scrollTo(0, 300)); await wide.waitForTimeout(400);
    check(await wide.evaluate(() => document.querySelector("[data-header='slim']").hasAttribute("data-solid")), "header turns solid after scrolling");
  }
  // Footer: the reference's grid at 1920 wide (sign-up at x32, link columns at 661, 976, 1291, 1606; 25px link rows; 387px tall).
  {
    const wide = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await wide.goto(`${base}/`, { waitUntil: "load" });
    await wide.getByRole("button", { name: "Reject all" }).click({ timeout: 2500 }).catch(() => {});
    const m = await wide.evaluate(() => {
      const f = document.querySelector("[data-footer='catalogue']"); const fb = f.getBoundingClientRect();
      const hs = [...f.querySelectorAll("h2")].map((e) => Math.round(e.getBoundingClientRect().x));
      const col = f.querySelectorAll("ul")[0]; const links = [...col.querySelectorAll("a")].map((e) => Math.round(e.getBoundingClientRect().y - fb.y));
      const legal = f.querySelector("nav a"); const ls = getComputedStyle(legal);
      return { h: Math.round(fb.height), hs, links: links.slice(0, 3), legalY: Math.round(legal.getBoundingClientRect().y - fb.y), fs: ls.fontSize, bg: getComputedStyle(f).backgroundColor, news: document.querySelectorAll("#newsletter").length };
    });
    check(m.h === 387, `footer is 387px tall (${m.h})`);
    check(m.hs.join() === "32,661,976,1291,1606" || m.hs.join() === "32,661,976,1291,1605", `footer columns start at 32, 661, 976, 1291, 1606 (${m.hs.join()})`);
    check(m.links.join() === "104,129,154", `link rows start at 104 with a 25px pitch (${m.links.join()})`);
    check(m.legalY === 355 && m.fs === "12px", `legal row at 355, 12px (${m.legalY}, ${m.fs})`);
    check(m.bg === "rgb(255, 255, 255)" && m.news === 1, "white footer with exactly one sign-up (#newsletter)");
  }
  // Catalogue collection page: measured against the reference at 1920 wide.
  {
    const wide = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await wide.goto(`${base}/collections/streetwear-hats`, { waitUntil: "load" });
    await wide.getByRole("button", { name: "Reject all" }).click({ timeout: 2500 }).catch(() => {});
    const m = await wide.evaluate(() => {
      const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y + scrollY), Math.round(b.width), Math.round(b.height)].join(","); };
      const arts = [...document.querySelectorAll("article.pcard-cat")]; const g = arts[0]?.parentElement;
      const tiles = [...document.querySelectorAll("[data-catalogue-head] ul")].pop();
      return { header: r(document.querySelector("header")), h1: r(document.querySelector("h1")), cols: g && getComputedStyle(g).gridTemplateColumns, gap: g && getComputedStyle(g).gap, card: arts[0] && r(arts[0]), img: arts[0] && r(arts[0].querySelector("div.relative")), tile: tiles && r(tiles.querySelector("a")), n: arts.length, docW: document.documentElement.scrollWidth };
    });
    check(m.header === "0,0,1920,46", `catalogue: header is 46px tall (${m.header})`);
    check(m.h1.startsWith("24,62,"), `catalogue: title sits at 24,62 (${m.h1})`);
    check(m.cols === "479.25px 479.25px 479.25px 479.25px" && m.gap === "35px 1px", `catalogue: 4 columns, 35px row gap, 1px column gap (${m.cols} / ${m.gap})`);
    check(m.card?.endsWith(",479,711") && m.img?.endsWith(",479,639"), `catalogue: tile is 479 x 711 with a 3:4 image (${m.card} / ${m.img})`);
    check(m.tile === "24,214,300,350", `catalogue: lookbook tile is 300 x 350 at 24,214 (${m.tile})`);
    check(m.n === 12 && m.docW <= 1920, `catalogue: 12 products, no sideways scroll`);
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
  check(sm.includes("osaka76-castle-cap") && !sm.includes("velvet-tint"), "Osaka76 sitemap is its own");
} finally { await browser.close(); }
console.log(failed ? `\n${failed} check(s) failed` : "\nAll Osaka76 checks passed");
process.exit(failed ? 1 : 0);
