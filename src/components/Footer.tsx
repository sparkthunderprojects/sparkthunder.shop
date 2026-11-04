import Link from "next/link";
import { getCategories, getFranchises } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export async function Footer() {
  const [franchises, categories] = await Promise.all([getFranchises(), getCategories()]);
  return (
    <footer className="mt-24 border-t border-white/10 bg-panel">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold"><span className="text-accent">SPARK</span>THUNDER</p>
          <p className="mt-3 text-sm text-muted">{SITE.description}</p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest">Franchises</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {franchises.map((f) => <li key={f.slug}><Link className="hover:text-accent" href={`/franchises/${f.slug}`}>{f.name}</Link></li>)}
            <li><Link className="hover:text-accent" href="/franchises">All franchises</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest">Shop</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {categories.map((c) => <li key={c.slug}><Link className="hover:text-accent" href={`/categories/${c.slug}`}>{c.name}</Link></li>)}
            <li><Link className="hover:text-accent" href="/new">New arrivals</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest">Sparkthunder</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li><a className="hover:text-accent" href="https://knightverge.com">Knightverge.com</a></li>
            <li><a className="hover:text-accent" href="https://grimgala.com">GrimGala.com</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-6 text-center text-xs text-muted">© {new Date().getFullYear()} {SITE.legalName}. All rights reserved. Official merchandise.</p>
    </footer>
  );
}
