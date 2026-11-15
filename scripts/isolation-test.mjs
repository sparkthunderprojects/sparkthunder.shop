// Proves one store's design never reaches another: fingerprints the layout (every visible element's box and key styles) of the
// original shop and Miss Petty, and compares with scripts/isolation-baseline.json.
//   node scripts/isolation-test.mjs 3694            compare
//   node scripts/isolation-test.mjs 3694 --write    record a new baseline (only when a change to those shops is intended)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import { createHash } from "node:crypto"; import fs from "node:fs";
const require = createRequire(import.meta.url); let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const port = process.argv[2] ?? "3694", write = process.argv.includes("--write"), file = new URL("./isolation-baseline.json", import.meta.url);
const PAGES = [
  ["127.0.0.1", "/"], ["127.0.0.1", "/shop"], ["127.0.0.1", "/cart"], ["127.0.0.1", "/new"], ["127.0.0.1", "/help"],
  ["petty.localhost", "/"], ["petty.localhost", "/shop"],
];
const WIDTHS = [1440, 390];
const b = await chromium.launch(); const got = {};
for (const w of WIDTHS) for (const [host, path] of PAGES) {
  if (w === 390 && host === "petty.localhost" && path === "/") continue; // has a rotating element on phones: not stable to fingerprint
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem("consent", "x"); } catch {} });
  await p.goto(`http://${host}:${port}${path}`, { waitUntil: "load" }); await p.waitForTimeout(600);
  await p.getByRole("button", { name: "Reject all" }).click({ timeout: 1200 }).catch(() => {});
  const fp = await p.evaluate(() => {
    const out = [];
    for (const e of document.body.querySelectorAll("*")) {
      const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue; const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden") continue;
      out.push([e.tagName, Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height), s.color, s.backgroundColor, s.fontSize, s.fontWeight, s.fontFamily.slice(0, 30), s.letterSpacing, s.borderTopWidth, s.borderRadius]);
    }
    return out.join("|");
  });
  got[`${w} ${host}${path}`] = createHash("sha1").update(fp).digest("hex"); await ctx.close();
}
await b.close();
if (write) { fs.writeFileSync(file, JSON.stringify(got, null, 1)); console.log(`baseline written (${Object.keys(got).length} pages)`); process.exit(0); }
const base = JSON.parse(fs.readFileSync(file, "utf8")); let failed = 0;
for (const k of Object.keys(base)) { const ok = base[k] === got[k]; if (!ok) failed++; console.log(`${ok ? "ok  " : "FAIL"} ${k}`); }
console.log(failed ? `\n${failed} page(s) of the other shops changed` : "\nOther shops are unchanged");
process.exit(failed ? 1 : 0);
