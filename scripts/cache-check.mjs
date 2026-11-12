// Checks what a shared cache (CDN) is allowed to keep. Run against a started demo server:  node scripts/cache-check.mjs 3550
// Public pages must be cacheable, identical for every visitor and never set cookies; private pages must never be cacheable.
const base = `http://127.0.0.1:${process.argv[2] ?? "3550"}`;
let failed = 0; const bad = (m) => { failed++; console.log("FAIL", m); };
const PUBLIC = ["/", "/shop", "/new", "/products/knightverge-crest-tee", "/categories/apparel", "/franchises", "/franchises/knightverge", "/privacy", "/terms", "/delivery-returns"];
const PRIVATE = ["/cart", "/checkout", "/search?q=tee", "/account", "/account/login", "/admin", "/admin/orders", "/checkout/success?session_id=x", "/unsubscribe"];
for (const p of PUBLIC) {
  await (await fetch(base + p, { redirect: "manual" })).text(); // after a settings save the first request may still get the previous copy while the page is rebuilt; what matters here is that two visitors get the same page
  const a = await fetch(base + p, { redirect: "manual" });
  const cc = a.headers.get("cache-control") ?? "";
  if (!/s-maxage=\d+/.test(cc) || /no-store|private/.test(cc)) bad(`${p} is not cacheable by a CDN (${cc})`);
  if (a.headers.get("set-cookie")) bad(`${p} sets a cookie, so a shared cache must not keep it`);
  const body1 = await a.text();
  const b = await fetch(base + p, { redirect: "manual", headers: { Cookie: "sb-access-token=someone; spark-currency=USD; sparkthunder-cart-v1=x; anything=1", "Accept-Language": "fr" } });
  if ((await b.text()) !== body1) bad(`${p} looks different for a visitor with cookies: a shared cache would mix visitors up`);
}
for (const p of PRIVATE) {
  const r = await fetch(base + p, { redirect: "manual" });
  const cc = r.headers.get("cache-control") ?? "";
  if (/public|s-maxage/.test(cc)) bad(`${p} must not be kept by a shared cache (${cc})`);
}
console.log(failed ? `${failed} caching problems` : `${PUBLIC.length} public pages cacheable and visitor-independent, ${PRIVATE.length} private pages protected`);
process.exit(failed ? 1 : 0);
