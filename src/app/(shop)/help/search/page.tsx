import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { HelpHero } from "@/components/HelpUi";
import { getHelp } from "@/lib/help-ctx";
import { categoryBySlug, helpPath, searchHelp } from "@/lib/help";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Search the Help Centre", robots: { index: false, follow: true } };

export default async function HelpSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const q = ((await searchParams).q ?? "").slice(0, 100).trim();
  const [store, { articles }] = await Promise.all([getStore(), getHelp()]);
  const results = searchHelp(articles, q);
  return (
    <>
      <HelpHero store={store} crumbs={[{ name: "Home", href: "/" }, { name: "Help Centre", href: "/help" }, { name: "Search" }]} title="Search results" q={q} />
      <div className="mt-10 max-w-3xl" aria-live="polite">
        <h2 className="display text-2xl">{q ? `${results.length} result${results.length === 1 ? "" : "s"} for “${q}”` : "Type a question above"}</h2>
        {q && results.length === 0 ? (
          <p className="mt-4 text-muted" data-help="none">We could not find an answer for that. Try different words, browse the <Link href="/help" className="link-line font-bold">Help Centre sections</Link>, or <Link href="/help/contact" className="link-line font-bold">contact us</Link>.</p>
        ) : (
          <ul className="mt-6">
            {results.map((a) => (
              <li key={`${a.category}/${a.slug}`} className="border-b border-ink/10 py-5" data-helpresult={a.slug}>
                <Link href={helpPath(a) as never} className="text-lg font-bold hover:text-bolt">{a.title}</Link>
                <p className="mt-1 text-sm text-muted">{categoryBySlug(a.category)?.title}</p>
                <p className="mt-1">{a.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
