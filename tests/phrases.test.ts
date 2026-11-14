import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PHRASES_LIST } from "../src/lib/i18n/phrases";
import { ENGLISH } from "../src/lib/i18n/dictionaries";
import { BASKET_CONSENT } from "../src/lib/consent-text";

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (p.includes(join("src", "app", "admin")) ? [] : walk(p)) : /\.tsx?$/.test(f) ? [p] : []; });
const files = walk("src").filter((f) => !f.includes(join("lib", "i18n")));
const used = new Map<string, string>();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/(?<![\w.])t\(\s*"((?:[^"\\\n]|\\.)*)"/g)) used.set(m[1].replace(/\\"/g, '"'), f);
  for (const m of src.matchAll(/<T(?:\s[^>]*?)?\stext="([^"]+)"/g)) used.set(m[1], f);
  for (const m of src.matchAll(/<T>([^<{}]+)<\/T>/g)) used.set(m[1], f);
}
const book = new Map(PHRASES_LIST.map((p) => [p[0], p]));
const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

describe("phrase book", () => {
  it("has no duplicate English entries", () => {
    const seen = new Set<string>();
    for (const [en] of PHRASES_LIST) { expect(seen.has(en), en).toBe(false); seen.add(en); }
  });
  it("every translation is filled in and keeps the placeholders", () => {
    for (const [en, fr, de, es] of PHRASES_LIST) for (const x of [fr, de, es]) { expect(x.trim(), en).not.toBe(""); expect(ph(x), en).toBe(ph(en)); }
  });
  it("every phrase used in the shop has a French, German and Spanish version", () => {
    const missing = [...used].filter(([k]) => !book.has(k) && !(k in ENGLISH)).map(([k, f]) => `${k}  (${f})`);
    expect(missing).toEqual([]);
  });
  it("covers wording that is passed in from elsewhere", () => {
    expect(book.has(BASKET_CONSENT)).toBe(true);
  });
});
