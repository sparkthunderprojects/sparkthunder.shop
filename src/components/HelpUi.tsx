import { getT } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "@/components/LocaleLink";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { localePath } from "@/lib/i18n/config";
import { helpIcon, helpPieces, type HelpBlock } from "@/lib/help";

type Store = { name: string; dark: string; accent: string };

const Icon = ({ name, className = "h-8 w-8" }: { name: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={helpIcon(name)} /></svg>
);

/** Text with [label](/path) links turned into real links. */
export function HelpText({ text, linkClass = "link-line font-bold" }: { text: string; linkClass?: string }) {
  return <>{helpPieces(text).map((x, i) => x.href ? <Link key={i} href={x.href as never} className={linkClass}>{x.text}</Link> : <span key={i}>{x.text}</span>)}</>;
}

export function HelpBlocks({ blocks }: { blocks: HelpBlock[] }) {
  return (
    <div className="prose-lore legal">
      {blocks.map((b, i) =>
        "p" in b ? <p key={i}><HelpText text={b.p} /></p>
        : "h" in b ? <h2 key={i}>{b.h}</h2>
        : "ul" in b ? <ul key={i}>{b.ul.map((t, j) => <li key={j}><HelpText text={t} /></li>)}</ul>
        : <ol key={i}>{b.ol.map((t, j) => <li key={j}><HelpText text={t} /></li>)}</ol>)}
    </div>
  );
}

export async function HelpSearch({ q = "", className = "" }: { q?: string; className?: string }) {
  const { t, locale } = await getT();
  return (
    <form action={localePath("/help/search", locale)} method="get" role="search" className={`flex w-full max-w-2xl overflow-hidden rounded-full bg-white text-black shadow-xl ${className}`}>
      <label htmlFor="help-q" className="sr-only">{t("Type your question")}</label>
      <input id="help-q" name="q" defaultValue={q} placeholder={t("Type your question here")} autoComplete="off" className="min-w-0 flex-1 bg-transparent px-6 py-4 text-base outline-none" />
      <button className="m-1.5 rounded-full px-7 font-semibold text-white" style={{ background: "#0b57d0" }}>{t("Search")}</button>
    </form>
  );
}

/** Branded banner: breadcrumbs, title and the search box, with the three most common jobs as big buttons underneath. */
const PANELS = ["/help/panel-1.webp", "/help/panel-2.webp", "/help/panel-3.webp", "/help/panel-4.webp"];

export function HelpHero({ store, crumbs, title, q, big = false, panels = false }: { store: Store; crumbs: { name: string; href?: string }[]; title: string; q?: string; big?: boolean; panels?: boolean }) {
  return (
    <section className={`relative -mx-(--gutter) overflow-hidden text-white ${panels ? "md:pb-14" : ""}`} data-help="hero" style={{ background: `linear-gradient(180deg, ${store.dark} 0%, color-mix(in srgb, ${store.dark} 60%, ${store.accent}) 100%)` }}>
      {panels && (
        <div aria-hidden className="relative grid grid-cols-2 md:grid-cols-4" data-help="panels">
          {PANELS.map((src, i) => (
            <div key={src} className={`relative aspect-square ${i > 1 ? "hidden md:block" : ""}`}>
              <Image src={src} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-contain" priority={i < 2} />
            </div>
          ))}
          <div className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)" }} />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 md:hidden" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6), transparent)" }} />
        </div>
      )}
      <div aria-hidden className={`pointer-events-none absolute inset-0 ${panels ? "hidden" : ""}`}>
        <svg className="gc-drift absolute -bottom-4 left-0 h-3/5 w-full opacity-30" viewBox="0 0 1200 300" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M-20 ${250 - i * 6} C 300 ${290 - i * 10}, 700 ${120 + i * 8}, 1220 ${40 + i * 14}`} fill="none" stroke="white" strokeWidth="1" strokeOpacity={0.25 + i * 0.07} />)}
        </svg>
      </div>
      <div className="absolute left-(--gutter) top-5 z-20"><Breadcrumbs tone="world" items={crumbs} /></div>
      <div className={panels ? "relative md:absolute md:inset-x-0 md:bottom-14 md:top-0 md:flex md:items-center md:justify-center" : ""}>
        <div className={`relative mx-auto flex max-w-5xl flex-col items-center px-(--gutter) text-center ${panels ? "pb-28 pt-10 md:pb-6 md:pt-10" : big ? "pb-24 pt-20 md:pb-28" : "pb-12 pt-20"}`}>
          <h1 className="display text-[clamp(2rem,4.6vw,3.6rem)] drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">{title}</h1>
          <HelpSearch q={q} className="mt-6" />
        </div>
      </div>
    </section>
  );
}

const JOBS = [
  { label: "Track your order", href: "/account", icon: "box" },
  { label: "Return / exchange", href: "/help/returns/how-to-return", icon: "returns" },
  { label: "Request replacement", href: "/help/contact?topic=replacement", icon: "help" },
] as const;

export async function HelpJobs() {
  const { t } = await getT();
  return (
    <ul className="relative z-10 mx-auto -mt-10 grid max-w-5xl gap-3 px-1 sm:grid-cols-3" aria-label={t("Quick help")}>
      {JOBS.map((j) => (
        <li key={j.label}>
          <Link href={j.href as never} className="flex items-center justify-between gap-3 rounded-full bg-[#0b57d0] px-7 py-5 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-transform hover:-translate-y-0.5" data-helpjob={j.label}>
            <Icon name={j.icon} className="h-9 w-9 shrink-0" /><span className="flex-1 text-center">{t(j.label)}</span><span aria-hidden>&rarr;</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoryTile({ slug, title, blurb, icon }: { slug: string; title: string; blurb: string; icon: string }) {
  return (
    <Link href={`/help/${slug}` as never} className="group flex h-full items-center gap-4 border border-ink/15 bg-paper p-5 shadow-sm transition-shadow hover:shadow-lg" data-helpcat={slug}>
      <span className="text-bolt"><Icon name={icon} /></span>
      <span><span className="block text-lg font-bold">{title}</span><span className="block text-sm text-muted">{blurb}</span></span>
    </Link>
  );
}
