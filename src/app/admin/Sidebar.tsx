"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "./actions";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/franchises", label: "Franchises" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/media", label: "Media library" },
  { href: "/admin/gift-cards", label: "Gift cards" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/discounts", label: "Discount codes" },
  { href: "/admin/stock-alerts", label: "Stock alerts" },
  { href: "/admin/universe-sites", label: "Universe sites" },
];
const SEO: typeof NAV = [
  { href: "/admin/seo", label: "SEO audit" },
  { href: "/admin/redirects", label: "Redirects" },
  { href: "/admin/settings", label: "Settings" },
];

export function Sidebar({ email, demo }: { email: string; demo: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const item = (n: (typeof NAV)[number]) => {
    const on = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
    return <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}>{n.label}</Link>;
  };
  return (
    <aside className="adm-side">
      <div className="adm-brand"><i /> Sparkthunder admin</div>
      <nav className="adm-nav" aria-label="Admin" style={{ display: "contents" }}>
        {NAV.map(item)}
        <div className="adm-sep">Search</div>
        {SEO.map(item)}
        <div className="adm-sep">Coming soon</div>
        <span>Customers <small>Soon</small></span>
        <div className="adm-sep">Site</div>
        <a href="/" target="_blank" rel="noreferrer">View storefront</a>
      </nav>
      <div className="adm-side-foot">
        {demo ? <div style={{ color: "#ffd400", fontWeight: 700, marginBottom: 6 }}>Demo mode: changes are not saved to a database</div> : null}
        <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
        <button type="button" style={{ background: "none", border: 0, color: "#fff", textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: 4 }}
          onClick={async () => { await logoutAction(); router.push("/admin/login"); router.refresh(); }}>Sign out</button>
      </div>
    </aside>
  );
}
