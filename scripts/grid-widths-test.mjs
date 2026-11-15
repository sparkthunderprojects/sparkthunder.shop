import { createRequire } from "node:module"; import { execSync } from "node:child_process";
const require = createRequire(import.meta.url); let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
// Product tiles on the catalogue collection page at several widths, against the reference rule:
// four across from 1024px with 1px between, else two across with 3px; each tile is a 3:4 image plus a 72px footer.
//   node scripts/grid-widths-test.mjs 3693
const port = process.argv[2] ?? "3693"; let failed = 0;
const b = await chromium.launch();
for (const w of [1920, 1440, 1280, 1100, 1024, 1023, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
  await p.goto(`http://osaka76.localhost:${port}/collections/streetwear-hats`, { waitUntil: "load" });
  await p.getByRole("button", { name: "Reject all" }).click({ timeout: 1500 }).catch(() => {});
  const r = await p.evaluate(() => { const a = document.querySelector("[data-product-card], article"); const cards = [...document.querySelectorAll("[data-product-card], article")]; const c = cards[0]; const g = c.parentElement; const gs = getComputedStyle(g); const bb = c.getBoundingClientRect(); const im = c.querySelector("img")?.closest("div")?.getBoundingClientRect(); return { sb: innerWidth - document.documentElement.clientWidth, cols: gs.gridTemplateColumns.split(" ").length, cw: +bb.width.toFixed(2), ch: Math.round(bb.height), imgH: im && Math.round(im.height), imgW: im && +im.width.toFixed(2), gx: +g.getBoundingClientRect().x.toFixed(1), cg: gs.columnGap, rg: gs.rowGap, x1: +cards[1].getBoundingClientRect().x.toFixed(2) }; });
  const cols = w >= 1024 ? 4 : 2, cw = (w - (cols - 1) * (cols === 4 ? 1 : 3)) / cols;
  const ok = r.cols === cols && Math.abs(r.cw - cw) < 0.3 && Math.abs(r.imgH - Math.round(cw * 4 / 3)) <= 1 && Math.abs(r.ch - r.imgH - 72) <= 1 && r.cg === (cols === 4 ? "1px" : "3px") && r.rg === "35px";
  console.log(ok ? "ok  " : "FAIL", w, JSON.stringify(r)); if (!ok) failed++; await ctx.close();
}
await b.close();
console.log(failed ? `${failed} width(s) differ from the reference` : "Tiles match the reference at every width");
process.exit(failed ? 1 : 0);
