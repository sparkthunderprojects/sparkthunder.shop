// Accessibility check with axe-core on the main shopper pages. Run against a started demo server:
//   node scripts/a11y-test.mjs 3470      (playwright must be installed: npm i -D playwright, or use the global one)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:path").join(execSync("npm root -g").toString().trim(), "playwright"))); }
const port = process.argv[2] ?? "3470";
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const pages = ["/", "/products", "/products/knightverge-crest-tee", "/cart", "/checkout", "/search?q=tee", "/delivery-returns", "/privacy", "/account"];
const browser = await chromium.launch();
let bad = 0;
for (const path of pages) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(axeSource);
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
  const serious = r.violations.filter((v) => ["serious", "critical"].includes(v.impact));
  console.log(`${serious.length ? "FAIL" : "ok  "} ${path}  (${r.violations.length} issues, ${serious.length} serious/critical)`);
  for (const v of r.violations) { console.log(`   [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length}x  e.g. ${v.nodes[0].target.join(" ")}`); }
  bad += serious.length; await page.close();
}
await browser.close();
console.log(bad ? `${bad} serious or critical accessibility problems` : "No serious or critical accessibility problems");
process.exit(bad ? 1 : 0);
