import type { Category, Franchise, Product } from "@/lib/types";

function distance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** "dise sett" → "dice set": fixes small typos by matching each word against words the shop actually uses. Returns null when nothing needs fixing. */
export function correctQuery(q: string, products: Product[], franchises: Franchise[], categories: Category[]): string | null {
  const vocab = new Set<string>();
  const add = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3).forEach((w) => vocab.add(w));
  products.forEach((p) => { add(p.name); (p.tags ?? []).forEach(add); });
  franchises.forEach((f) => add(f.name));
  categories.forEach((c) => add(c.name));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let changed = false;
  const fixed = words.map((w) => {
    if (w.length < 3) return w;
    for (const v of vocab) if (v.startsWith(w)) return w; // still being typed, or already right
    let best = w, bestD = Math.max(1, Math.floor(w.length / 4)) + 1;
    for (const v of vocab) { const d = distance(w, v); if (d < bestD) { best = v; bestD = d; } }
    if (best !== w) changed = true;
    return best;
  });
  return changed ? fixed.join(" ") : null;
}
