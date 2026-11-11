"use client";
import { useEffect, useState } from "react";

type F = { slug: string; name: string };

export function EmbedBuilder({ franchises }: { franchises: F[] }) {
  const [origin, setOrigin] = useState("https://sparkthunder.shop");
  const [franchise, setFranchise] = useState(franchises[0]?.slug ?? "all");
  const [limit, setLimit] = useState(4);
  const [sort, setSort] = useState("new");
  const [theme, setTheme] = useState("dark");
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => setOrigin(location.origin), []);

  const attrs = `franchise="${franchise}" limit="${limit}"${sort !== "new" ? ` sort="${sort}"` : ""}${theme !== "dark" ? ` theme="${theme}"` : ""}${title ? ` title="${title.replace(/"/g, "&quot;")}"` : ""}`;
  const html = `<script src="${origin}/embed/sparkthunder-products.js" async></script>\n<sparkthunder-products ${attrs}></sparkthunder-products>`;
  const feed = `${origin}/api/feed/products?franchise=${franchise}&limit=${limit}&sort=${sort}`;
  const next = `import { SparkthunderLatestProducts } from "@/components/SparkthunderLatestProducts";\n\n<SparkthunderLatestProducts franchise="${franchise}" limit={${limit}}${title ? ` title="${title}"` : ""} />`;

  const copy = async (k: string, v: string) => { try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(""), 1500); } catch {} };
  const block = (k: string, label: string, code: string, hint: string) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>{label}</strong><button type="button" className="adm-btn" onClick={() => copy(k, code)}>{copied === k ? "Copied" : "Copy"}</button></div>
      <pre style={{ background: "#0b0b12", color: "#e6e6f0", padding: 12, borderRadius: 8, overflow: "auto", fontSize: 12, margin: "6px 0" }}>{code}</pre>
      <small>{hint}</small>
    </div>
  );

  return (
    <div className="adm-card">
      <h3>Embed builder</h3>
      <div className="adm-grid adm-g4" style={{ marginBottom: 16 }}>
        <label>Universe<select value={franchise} onChange={(e) => setFranchise(e.target.value)}>{franchises.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}<option value="all">All universes</option></select></label>
        <label>Products<input type="number" min={1} max={24} value={limit} onChange={(e) => setLimit(Math.min(24, Math.max(1, Number(e.target.value) || 4)))} /></label>
        <label>Order<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="new">Newest</option><option value="featured">Featured first</option></select></label>
        <label>Theme<select value={theme} onChange={(e) => setTheme(e.target.value)}><option value="dark">Dark</option><option value="light">Light</option></select></label>
      </div>
      <label style={{ display: "block", marginBottom: 16 }}>Heading (optional)<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Latest Knightverge merch" /></label>

      {block("html", "Any website (HTML)", html, "Paste where the products should appear. Works on Bolt, Wix, WordPress, plain HTML.")}
      {block("next", "Next.js / React site", next, "Copy integrations/next/SparkthunderLatestProducts.tsx from the shop repo into the site first.")}
      {block("feed", "JSON feed", feed, "Build your own layout. Public, read-only, cached for 5 minutes. Add &ref=your-site to name the traffic source.")}

      <strong>Live preview</strong>
      <div style={{ marginTop: 8 }} key={html}>
                <PreviewFrame html={html} origin={origin} />
      </div>
    </div>
  );
}

function PreviewFrame({ html, origin }: { html: string; origin: string }) {
  const doc = `<!doctype html><body style="margin:0;padding:12px;background:#222">${html.replace(`src="${origin}`, `src="${origin}`)}</body>`;
  return <iframe title="Preview" srcDoc={doc} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style={{ width: "100%", height: 420, border: "1px solid #333", borderRadius: 8, background: "#222" }} />;
}
