// Performance budget: how much JavaScript a shopper downloads and the Core Web Vitals (LCP, CLS) on key pages, in a real browser.
// Run against a started demo server:  node scripts/perf-budget.mjs 3510          Set BUDGET_SCALE=1.5 on a slow machine.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const base = `http://127.0.0.1:${process.argv[2] ?? "3510"}`;
const scale = Number(process.env.BUDGET_SCALE ?? 1);
// jsKB = JavaScript downloaded (compressed), lcp in ms, cls unitless (Google's "good" thresholds are 2500 ms and 0.1).
const BUDGETS = JSON.parse(process.env.BUDGETS ?? "null") ?? {
  "/": { jsKB: 230, lcp: 2500, cls: 0.1 },
  "/shop": { jsKB: 230, lcp: 2500, cls: 0.1 },
  "/products/knightverge-crest-tee": { jsKB: 240, lcp: 2500, cls: 0.1 },
  "/cart": { jsKB: 230, lcp: 2500, cls: 0.1 },
};
const browser = await chromium.launch(); let failed = 0;
for (const [path, b] of Object.entries(BUDGETS)) {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => ({
    js: performance.getEntriesByType("resource").filter((r) => r.initiatorType === "script" || /\.js(\?|$)/.test(r.name)).reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0),
    lcp: window.__lcp, cls: window.__cls,
  }));
  const kb = Math.round(m.js / 1024), lcp = Math.round(m.lcp), cls = Math.round(m.cls * 1000) / 1000;
  const problems = [];
  if (kb > b.jsKB * scale) problems.push(`JavaScript ${kb} KB (budget ${b.jsKB})`);
  if (lcp > b.lcp * scale) problems.push(`LCP ${lcp} ms (budget ${b.lcp})`);
  if (cls > b.cls) problems.push(`CLS ${cls} (budget ${b.cls})`);
  console.log(`${problems.length ? "FAIL" : "ok  "} ${path}  JS ${kb} KB, LCP ${lcp} ms, CLS ${cls}${problems.length ? "  <- " + problems.join("; ") : ""}`);
  failed += problems.length; await page.close();
}
await browser.close();
console.log(failed ? `${failed} budget problems` : "Within the performance budget");
process.exit(failed ? 1 : 0);
