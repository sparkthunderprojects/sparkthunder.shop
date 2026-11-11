export type LinkTarget = { name: string; href: string };
export type Piece = { text: string; href?: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Turn the first mention of other pages' names inside a description into links, so related pages support each other in search.
 * Rules: whole words only, case-insensitive; each page is linked at most once; at most `max` links; names shorter than 5 characters
 * are ignored; longer names win over shorter ones that sit inside them; never links to `selfHref`.
 */
export function autoLink(text: string, targets: LinkTarget[], o: { selfHref?: string; max?: number } = {}): Piece[] {
  const max = o.max ?? 3;
  const usable = targets.filter((t) => t.name.trim().length >= 5 && t.href !== o.selfHref).sort((a, b) => b.name.length - a.name.length);
  const found: { start: number; end: number; href: string }[] = [];
  const doneHref = new Set<string>();
  for (const t of usable) {
    if (doneHref.has(t.href)) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc(t.name.trim())}(?![\\p{L}\\p{N}])`, "giu");
    const hit = [...text.matchAll(re)].find((m) => !found.some((f) => m.index < f.end && m.index + m[0].length > f.start));
    if (!hit) continue;
    const start = hit.index, end = start + hit[0].length;
    found.push({ start, end, href: t.href }); doneHref.add(t.href);
  }
  const chosen = found.sort((a, b) => a.start - b.start).slice(0, max);
  const out: Piece[] = []; let at = 0;
  for (const f of chosen) { if (f.start > at) out.push({ text: text.slice(at, f.start) }); out.push({ text: text.slice(f.start, f.end), href: f.href }); at = f.end; }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out.length ? out : [{ text }];
}
