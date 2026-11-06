// Multi-store isolation and SEO test. Run against a started demo server:
//   SPARKTHUNDER_DEMO=1 SPARKTHUNDER_DEMO_STORES=100 npx next start -p 3460   then   node scripts-isolation-test.mjs 3460 100
const port = process.argv[2] ?? "3460", n = Number(process.argv[3] ?? 100);
import http from "node:http";
// fetch() will not let us set the Host header, so use http directly.
const get = (host, path) => new Promise((resolve, reject) => {
  const req = http.get({ host: "127.0.0.1", port, path, headers: { Host: `${host}:${port}` } }, (res) => {
    let body = ""; res.setEncoding("utf8"); res.on("data", (c) => (body += c));
    res.on("end", () => resolve({ status: res.statusCode, headers: { get: (k) => res.headers[k.toLowerCase()] ?? null }, text: async () => body }));
  });
  req.on("error", reject);
});
let fail = 0; const bad = (m) => { fail++; if (fail < 25) console.log("FAIL", m); };
const t0 = Date.now(); const times = [];

for (let i = 1; i <= n; i++) {
  const host = `s${i}.localhost`;
  const s = Date.now();
  const home = await get(host, "/"); const html = await home.text();
  times.push(Date.now() - s);
  if (home.status !== 200) { bad(`${host} / -> ${home.status}`); continue; }
  if (!html.includes(`Shop ${i} Item A`)) bad(`${host} home missing own product`);
  const other = (i % n) + 1;
  if (html.includes(`Shop ${other} Item`)) bad(`${host} home leaks Shop ${other}`);
  if (/Knightverge Crest|Velvet Lip/.test(html)) bad(`${host} leaks another store's products`);
  if (/spark-merchant\.invalid|\{\{brand\}\}/.test(html)) bad(`${host} leaked a placeholder`);
  const p = await get(host, "/products/item-a"); const ph = await p.text();
  if (p.status !== 200 || !ph.includes(`Shop ${i} Item A`)) bad(`${host} product page`);
  const foreign = await get(host, "/products/knightverge-crest-tee"); if (foreign.status !== 404) bad(`${host} serves Sparkthunder's product (${foreign.status})`);
  const sm = await (await get(host, "/sitemap.xml")).text();
  if (!sm.includes(`<loc>http://${host}:${port}/products/item-a`) && !sm.includes(`/products/item-a`)) bad(`${host} sitemap missing its product`);
  if (/knightverge-crest|velvet-tint/.test(sm) || sm.includes(`s${other}.localhost`)) bad(`${host} sitemap leaks`);
  const canon = ph.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
  if (!canon.includes(host)) bad(`${host} canonical is ${canon}`);
}
// Unknown domains must not be served.
for (const host of ["evil.example.com", "random-domain.org"]) {
  const r = await get(host, "/"); if (r.status !== 404) bad(`unknown host ${host} -> ${r.status}`);
  if (!(r.headers.get("x-robots-tag") ?? "").includes("noindex")) bad(`unknown host ${host} not noindex`);
}
// The original store and Miss Petty still work.
const main = await (await get("localhost", "/")).text(); if (!main.includes("Knightverge")) bad("main store broken");
const mp = await (await get("petty.localhost", "/")).text(); if (!mp.includes("Velvet Lip Tint")) bad("miss petty broken");
times.sort((a, b) => a - b);
console.log(`${n} stores checked in ${((Date.now() - t0) / 1000).toFixed(1)}s | home p50 ${times[Math.floor(n / 2)]}ms p95 ${times[Math.floor(n * 0.95)]}ms max ${times[n - 1]}ms`);
console.log(fail ? `${fail} FAILURES` : "ALL PASSED");
process.exit(fail ? 1 : 0);
