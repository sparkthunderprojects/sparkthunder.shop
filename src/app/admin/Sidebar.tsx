"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { logoutAction } from "./actions";
import { switchStoreAction } from "./stores-actions";
import type { StoreRow } from "@/lib/db/stores";
import { can, permForPath, type Perms } from "@/lib/admin/roles";

type Item = { href: string; label: string; exact?: boolean };
type Group = { title?: string; icon: string; items: Item[]; ownerOnly?: boolean };

/** 24x24 line icons (paths only), one per group. */
const ICON: Record<string, string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  orders: "M4 7h16l-1.5 12h-13L4 7zM9 7a3 3 0 016 0",
  catalogue: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01",
  marketing: "M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 9a4 4 0 010 6M18 6a8 8 0 010 12",
  analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  store: "M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  stores: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
};
const Icon = ({ n }: { n: string }) => <svg className="adm-ico" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[n]} /></svg>;

const GROUPS: Group[] = [
  { icon: "home", items: [{ href: "/admin", label: "Home", exact: true }] },
  { title: "Orders", icon: "orders", items: [{ href: "/admin/orders", label: "All orders" }, { href: "/admin/returns", label: "Returns" }, { href: "/admin/customers", label: "Customers" }] },
  { title: "Products", icon: "catalogue", items: [{ href: "/admin/products", label: "All products" }, { href: "/admin/collections", label: "Collections" }, { href: "/admin/categories", label: "Categories" }, { href: "/admin/franchises", label: "Franchises" }, { href: "/admin/characters", label: "Characters" }, { href: "/admin/stock-alerts", label: "Stock alerts" }, { href: "/admin/gift-cards", label: "Gift cards" }, { href: "/admin/media", label: "Media library" }, { href: "/admin/schedule", label: "Scheduled changes" }] },
  { title: "Marketing", icon: "marketing", items: [{ href: "/admin/discounts", label: "Discount codes" }, { href: "/admin/promotions", label: "Automatic offers" }, { href: "/admin/rewards", label: "Spark points" }, { href: "/admin/reviews", label: "Reviews" }, { href: "/admin/questions", label: "Questions" }] },
  { title: "Analytics", icon: "analytics", items: [{ href: "/admin/analytics", label: "Overview" }, { href: "/admin/sales", label: "Sales and stock" }] },
  { title: "Online store", icon: "store", items: [{ href: "/admin/theme", label: "Theme and layout" }, { href: "/admin/store", label: "Brand and design" }, { href: "/admin/languages", label: "Languages" }, { href: "/admin/universe-sites", label: "Universe sites" }] },
  { title: "Search", icon: "search", items: [{ href: "/admin/seo", label: "SEO audit" }, { href: "/admin/redirects", label: "Redirects" }, { href: "/admin/launch", label: "Launch checklist" }] },
  { title: "Settings", icon: "settings", items: [{ href: "/admin/commerce", label: "Shipping and payments" }, { href: "/admin/printify", label: "Printify" }, { href: "/admin/developers", label: "Developers" }, { href: "/admin/settings", label: "Settings" }, { href: "/admin/health", label: "Health" }, { href: "/admin/activity", label: "Activity log" }] },
  { title: "All stores", icon: "stores", ownerOnly: true, items: [{ href: "/admin/overview", label: "Overview" }, { href: "/admin/stores", label: "Stores" }, { href: "/admin/domains", label: "Domains" }] },
];

export function Sidebar({ email, demo, stores, current, owner, perms }: { email: string; demo: boolean; stores: StoreRow[]; current: string; owner: boolean; perms: Perms }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false), [q, setQ] = useState(""), [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); setQ(""); setMenu(false); }, [path]);
  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setQ(""); setMenu(false); } };
    document.addEventListener("mousedown", away); return () => document.removeEventListener("mousedown", away);
  }, []);
  const allowed = (n: Item) => { const need = permForPath(n.href); return !(need && !can(perms, need)); }; // hidden, and the page itself refuses too
  const groups = useMemo(() => GROUPS.filter((g) => !g.ownerOnly || owner).map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length), [owner, perms]); // eslint-disable-line react-hooks/exhaustive-deps
  const hits = q.trim() ? groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title ?? "" }))).filter((i) => (i.label + " " + i.group).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const on = (n: Item) => (n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/"));
  const storeName = stores.find((x) => x.id === current)?.name;
  return (
    <>
      <header className="adm-top">
        <button type="button" className="adm-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        <Link href="/admin" className="adm-top-brand"><i aria-hidden>⚡</i><span>Spark Merchant</span></Link>
        <div className="adm-search" ref={box}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={ICON.search} /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the admin" aria-label="Search the admin"
            onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) { router.push(hits[0].href); setQ(""); } if (e.key === "Escape") setQ(""); }} />
          {q.trim() ? <div className="adm-search-res" role="listbox">{hits.length ? hits.map((h) => <Link key={h.href} href={h.href} role="option"><b>{h.label}</b><small>{h.group}</small></Link>) : <p>Nothing found</p>}</div> : null}
        </div>
        <div className="adm-top-r">
          {demo ? <span className="adm-demo" title="Changes are not saved to a database">Demo mode</span> : null}
          <a className="adm-top-link" href={`/admin/preview?store=${encodeURIComponent(current)}`} target="_blank" rel="noreferrer">View storefront</a>
          <label className="adm-store">
            <span className="adm-sr">Store being edited</span>
            <select value={current} aria-label="Store being edited" onChange={async (e) => { await switchStoreAction(e.target.value); router.refresh(); }}>
              {current === "" ? <option value="">Choose a store</option> : null}
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="adm-acct">
            <button type="button" className="adm-avatar" aria-label="Account" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>{(email[0] ?? "?").toUpperCase()}</button>
            {menu ? <div className="adm-acct-menu"><div className="adm-acct-mail">{email}</div>
              <button type="button" onClick={async () => { await logoutAction(); router.push("/admin/login"); router.refresh(); }}>Log out</button></div> : null}
          </div>
        </div>
      </header>
      {open ? <div className="adm-scrim" onClick={() => setOpen(false)} aria-hidden /> : null}
      <aside className={`adm-side ${open ? "open" : ""}`}>
        <label className="adm-store-m">Store
          <select value={current} aria-label="Store being edited (menu)" onChange={async (e) => { await switchStoreAction(e.target.value); router.refresh(); }}>
            {current === "" ? <option value="">Choose a store</option> : null}
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <nav className="adm-nav" aria-label="Admin">
          {groups.map((g) => (
            <div key={g.title ?? "home"} className="adm-grp">
              {g.title ? <div className="adm-sep"><Icon n={g.icon} />{g.title}</div> : null}
              {g.items.map((n) => <Link key={n.href} href={n.href} aria-current={on(n) ? "page" : undefined} className={g.title ? "adm-sub" : "adm-top1"}>{g.title ? null : <Icon n={g.icon} />}{n.label}</Link>)}
            </div>
          ))}
        </nav>
        {storeName ? <div className="adm-side-foot">Editing <b>{storeName}</b></div> : null}
      </aside>
    </>
  );
}
