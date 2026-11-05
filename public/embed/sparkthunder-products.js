/*! Sparkthunder "Latest products" widget. Usage:
 *  <script src="https://sparkthunder.shop/embed/sparkthunder-products.js" async></script>
 *  <sparkthunder-products franchise="knightverge" limit="4"></sparkthunder-products>
 */
(function () {
  if (window.customElements && customElements.get("sparkthunder-products")) return;
  var script = document.currentScript;
  var ORIGIN = "https://sparkthunder.shop";
  try { if (script && script.src) ORIGIN = new URL(script.src).origin; } catch (e) {}

  var CSS = ":host{display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;--a:var(--accent,#f5b301);--bg:#0b0b12;--fg:#f4f4f8;--mut:#9a9ab0;--card:#14141f;--bd:#262636}" +
    ":host([theme=light]){--bg:#fff;--fg:#14141f;--mut:#5d5d70;--card:#f5f5f8;--bd:#e1e1ea}" +
    ".w{background:var(--bg);color:var(--fg);padding:20px;border-radius:14px;border:1px solid var(--bd)}" +
    ".h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:14px;flex-wrap:wrap}" +
    "h2{margin:0;font-size:1.15rem;letter-spacing:.02em}.all{color:var(--a);font-size:.85rem;text-decoration:none;font-weight:600}.all:hover{text-decoration:underline}" +
    ".g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}" +
    "a.c{display:block;background:var(--card);border:1px solid var(--bd);border-radius:10px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .15s,border-color .15s}" +
    "a.c:hover,a.c:focus-visible{transform:translateY(-2px);border-color:var(--a);outline:none}" +
    ".i{position:relative;aspect-ratio:1/1;background:#000}.i img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".b{position:absolute;top:8px;left:8px;background:var(--a);color:#000;font-size:.65rem;font-weight:800;padding:2px 7px;border-radius:99px;letter-spacing:.06em}" +
    ".t{padding:10px 12px 12px}.n{font-size:.85rem;line-height:1.3;margin:0 0 6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
    ".p{font-weight:700;font-size:.9rem}.p s{color:var(--mut);font-weight:400;margin-left:6px;font-size:.8rem}.o{color:var(--mut);font-size:.75rem;margin-left:6px}" +
    ".sk{height:210px;border-radius:10px;background:linear-gradient(90deg,var(--card),var(--bd),var(--card));background-size:200% 100%;animation:s 1.2s infinite}@keyframes s{to{background-position:-200% 0}}" +
    ".f{margin-top:12px;font-size:.7rem;color:var(--mut)}.f a{color:inherit}";

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function safeUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : "#"; } catch (e) { return "#"; } }

  class SparkthunderProducts extends HTMLElement {
    connectedCallback() {
      if (this._done) return; this._done = true;
      var root = this.attachShadow({ mode: "open" });
      var style = el("style"); style.textContent = CSS; root.appendChild(style);
      var accent = this.getAttribute("accent"); if (accent && /^#[0-9a-f]{3,8}$/i.test(accent)) this.style.setProperty("--accent", accent);
      var wrap = el("div", "w"); root.appendChild(wrap);
      var g = el("div", "g"); for (var i = 0; i < 4; i++) g.appendChild(el("div", "sk")); wrap.appendChild(g);
      var fr = this.getAttribute("franchise") || "all";
      var q = "franchise=" + encodeURIComponent(fr) + "&limit=" + encodeURIComponent(this.getAttribute("limit") || "4") +
        "&sort=" + encodeURIComponent(this.getAttribute("sort") || "new") + "&ref=" + encodeURIComponent(this.getAttribute("ref") || location.hostname.replace(/[^a-z0-9]+/gi, "-"));
      if (this.getAttribute("instock") === "1") q += "&instock=1";
      var self = this;
      fetch(ORIGIN + "/api/feed/products?" + q).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
        if (!d.products || !d.products.length) { self.style.display = "none"; return; }
        if (!accent && d.franchise && /^#[0-9a-f]{3,8}$/i.test(d.franchise.accent || "")) self.style.setProperty("--accent", d.franchise.accent);
        wrap.textContent = "";
        var h = el("div", "h"); h.appendChild(el("h2", "", self.getAttribute("title") || (d.franchise ? "Latest " + d.franchise.name + " merch" : "Latest from the Sparkthunder shop")));
        var all = el("a", "all", "Shop all ↗"); all.href = safeUrl(d.franchise ? d.franchise.url : d.shop.url); all.target = "_blank"; all.rel = "noopener"; h.appendChild(all); wrap.appendChild(h);
        var grid = el("div", "g");
        d.products.forEach(function (p) {
          var a = el("a", "c"); a.href = safeUrl(p.url); a.target = "_blank"; a.rel = "noopener";
          var i = el("div", "i"), img = el("img"); img.src = safeUrl(p.image); img.alt = p.name; img.loading = "lazy"; i.appendChild(img);
          if (p.isNew) i.appendChild(el("span", "b", "NEW")); a.appendChild(i);
          var t = el("div", "t"); t.appendChild(el("p", "n", p.name));
          var pr = el("div", "p", p.price);
          if (p.comparePricePence && p.comparePricePence > p.pricePence) pr.appendChild(el("s", "", new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p.comparePricePence / 100)));
          if (!p.inStock) pr.appendChild(el("span", "o", "Sold out"));
          t.appendChild(pr); a.appendChild(t); grid.appendChild(a);
        });
        wrap.appendChild(grid);
        var f = el("div", "f", "Official merch at "); var fa = el("a", "", d.shop.name); fa.href = safeUrl(d.shop.url); fa.target = "_blank"; fa.rel = "noopener"; f.appendChild(fa); wrap.appendChild(f);
      }).catch(function () { self.style.display = "none"; });
    }
  }
  customElements.define("sparkthunder-products", SparkthunderProducts);

  function upgrade() {
    document.querySelectorAll("div[data-sparkthunder-products]").forEach(function (d) {
      var w = document.createElement("sparkthunder-products");
      ["franchise", "limit", "sort", "theme", "title", "ref", "accent", "instock"].forEach(function (k) { var v = d.getAttribute("data-" + k); if (v) w.setAttribute(k, v); });
      d.replaceWith(w);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", upgrade); else upgrade();
})();
