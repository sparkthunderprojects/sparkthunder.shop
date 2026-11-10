"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "./actions";
import { switchStoreAction } from "./stores-actions";
import type { StoreRow } from "@/lib/db/stores";

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
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/rewards", label: "Spark points" },
  { href: "/admin/discounts", label: "Discount codes" },
  { href: "/admin/stock-alerts", label: "Stock alerts" },
  { href: "/admin/universe-sites", label: "Universe sites" },
];
const SEO: typeof NAV = [
  { href: "/admin/seo", label: "SEO audit" },
  { href: "/admin/redirects", label: "Redirects" },
  { href: "/admin/store", label: "Brand and design" },
  { href: "/admin/commerce", label: "Shipping and payments" },
  { href: "/admin/printify", label: "Printify" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/health", label: "Health" },
  { href: "/admin/activity", label: "Activity log" },
];

export function Sidebar({ email, demo, stores, current, owner }: { email: string; demo: boolean; stores: StoreRow[]; current: string; owner: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const item = (n: (typeof NAV)[number]) => {
    const on = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
    return <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}>{n.label}</Link>;
  };
  return (
    <aside className="adm-side">
      <div className="adm-brand"><i /> Spark Merchant</div>
      <label style={{ display: "block", padding: "0 12px 10px", fontSize: 12 }}>
        Store
        <select value={current} aria-label="Store being edited" style={{ width: "100%", marginTop: 4 }}
          onChange={async (e) => { await switchStoreAction(e.target.value); router.refresh(); }}>
          {current === "" ? <option value="">Choose a store</option> : null}
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <nav className="adm-nav" aria-label="Admin" style={{ display: "contents" }}>
        {NAV.map(item)}
        <div className="adm-sep">Search</div>
        {SEO.map(item)}
        {owner ? item({ href: "/admin/overview", label: "All stores" }) : null}
        {owner ? item({ href: "/admin/stores", label: "Stores" }) : null}
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
