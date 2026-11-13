import Link from "@/components/LocaleLink";

export function Breadcrumbs({ items, tone = "paper" }: { items: { name: string; href?: string }[]; tone?: "paper" | "world" }) {
  const muted = tone === "world" ? "text-paper/70" : "text-muted";
  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${muted}`}>
      <ol className="flex flex-wrap items-center gap-x-2">
        {items.map((it, i) => (
          <li key={it.name} className="flex items-center gap-2">
            {it.href ? <Link href={it.href} className="hover:underline hover:underline-offset-4">{it.name}</Link> : <span aria-current="page" className="font-bold">{it.name}</span>}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
