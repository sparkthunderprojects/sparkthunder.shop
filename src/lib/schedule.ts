import type { Db } from "@/lib/db/clients";
import { formatPrice } from "@/lib/site";

/** Things a store can schedule. Each can have an end time, when it is undone. */
export const SCHEDULE_ACTIONS = ["show_product", "hide_product", "sale", "show_collection", "hide_collection"] as const;
export type ScheduleAction = (typeof SCHEDULE_ACTIONS)[number];
export type ScheduleStatus = "pending" | "live" | "done" | "failed" | "cancelled";
export type ScheduledRow = {
  id: string; action: ScheduleAction; target: string; run_at: string; ends_at: string | null;
  percent_off: number | null; status: ScheduleStatus; before: SaleBefore | null; result: string; created_at?: string;
};
type VariantPrices = { name: string; price: number; compare: number | null };
export type SaleBefore = { price: number; compare: number | null; salePrice: number; percent: number; variants: VariantPrices[] };
type Variant = { name: string; pricePence?: number; comparePricePence?: number; [k: string]: unknown };

export const isProductAction = (a: ScheduleAction) => a === "show_product" || a === "hide_product" || a === "sale";
export const LABELS: Record<ScheduleAction, string> = { show_product: "Show a product", hide_product: "Hide a product", sale: "Run a sale on a product", show_collection: "Show a collection", hide_collection: "Hide a collection" };

export const describeSchedule = (r: Pick<ScheduledRow, "action" | "target" | "percent_off">) =>
  r.action === "sale" ? `${r.percent_off}% off ${r.target}` : `${LABELS[r.action].split(" ")[0]} ${r.action.endsWith("collection") ? "collection" : "product"} ${r.target}`;

/** The price a sale gives (never below 1p). */
export const salePrice = (pence: number, percentOff: number) => Math.max(1, Math.round((pence * (100 - percentOff)) / 100));

/** What to write to a product to start a sale, and what to remember so it can be undone. The old price becomes the "was" price. */
export function startSale(p: { price_pence: number; compare_price_pence: number | null; variants?: Variant[] | null }, percentOff: number) {
  const price = salePrice(p.price_pence, percentOff);
  const variants = (p.variants ?? []).map((v) => (typeof v.pricePence === "number" ? { ...v, pricePence: salePrice(v.pricePence, percentOff), comparePricePence: v.pricePence } : v));
  const before: SaleBefore = {
    price: p.price_pence, compare: p.compare_price_pence ?? null, salePrice: price, percent: percentOff,
    variants: (p.variants ?? []).filter((v) => typeof v.pricePence === "number").map((v) => ({ name: v.name, price: v.pricePence as number, compare: v.comparePricePence ?? null })),
  };
  return { patch: { price_pence: price, compare_price_pence: p.price_pence, variants }, before };
}

/** Undo a sale, but only for prices still exactly as the sale set them: anything changed by hand in the meantime is left alone. */
export function endSale(p: { price_pence: number; compare_price_pence: number | null; variants?: Variant[] | null }, b: SaleBefore) {
  const patch: Record<string, unknown> = {};
  let kept = false;
  if (p.price_pence === b.salePrice) { patch.price_pence = b.price; patch.compare_price_pence = b.compare; } else kept = true;
  const variants = (p.variants ?? []).map((v) => {
    const was = b.variants.find((x) => x.name === v.name);
    if (!was || v.pricePence !== salePrice(was.price, b.percent)) { if (was) kept = true; return v; }
    const out = { ...v, pricePence: was.price } as Variant;
    if (was.compare == null) delete out.comparePricePence; else out.comparePricePence = was.compare;
    return out;
  });
  if (p.variants?.length) patch.variants = variants;
  return { patch, kept };
}

export type RunResult = { started: number; ended: number; failed: number; skipped: number };
const iso = (ms: number) => new Date(ms).toISOString();

async function applyStart(db: Db, r: ScheduledRow): Promise<{ before?: SaleBefore; note: string }> {
  if (r.action === "show_product" || r.action === "hide_product") {
    const { data, error } = await db.from("products").update({ published: r.action === "show_product" }).eq("slug", r.target).select("slug");
    if (error || !(data as unknown[] | null)?.length) throw new Error(`Product "${r.target}" was not found.`);
    return { note: r.action === "show_product" ? "Shown" : "Hidden" };
  }
  if (r.action === "show_collection" || r.action === "hide_collection") {
    const { data, error } = await db.from("collections").update({ published: r.action === "show_collection" }).eq("slug", r.target).select("slug");
    if (error || !(data as unknown[] | null)?.length) throw new Error(`Collection "${r.target}" was not found.`);
    return { note: r.action === "show_collection" ? "Shown" : "Hidden" };
  }
  const { data } = await db.from("products").select("price_pence, compare_price_pence, variants").eq("slug", r.target).maybeSingle();
  const p = data as { price_pence: number; compare_price_pence: number | null; variants: Variant[] | null } | null;
  if (!p) throw new Error(`Product "${r.target}" was not found.`);
  const { patch, before } = startSale(p, r.percent_off ?? 0);
  const { error } = await db.from("products").update(patch).eq("slug", r.target);
  if (error) throw new Error(error.message);
  return { before, note: `Sale started: ${formatPrice(p.price_pence)} to ${formatPrice(before.salePrice)}` };
}

async function applyEnd(db: Db, r: ScheduledRow): Promise<string> {
  if (r.action === "sale") {
    const { data } = await db.from("products").select("price_pence, compare_price_pence, variants").eq("slug", r.target).maybeSingle();
    const p = data as { price_pence: number; compare_price_pence: number | null; variants: Variant[] | null } | null;
    if (!p || !r.before) return "Sale ended (product or saved prices no longer there; nothing changed)";
    const { patch, kept } = endSale(p, r.before);
    if (Object.keys(patch).length) await db.from("products").update(patch).eq("slug", r.target);
    return kept ? "Sale ended. A price that was changed by hand was left as it is." : "Sale ended, prices restored";
  }
  const col = r.action.endsWith("collection") ? "collections" : "products";
  await db.from(col).update({ published: r.action.startsWith("hide") }).eq("slug", r.target);
  return r.action.startsWith("show") ? "Hidden again at the end time" : "Shown again at the end time";
}

/** Apply everything that is due. Safe to run any number of times and from two places at once: each step is claimed before it is applied. */
export async function runScheduled(db: Db, now = Date.now()): Promise<RunResult> {
  const out: RunResult = { started: 0, ended: 0, failed: 0, skipped: 0 };
  const { data } = await db.from("scheduled_changes").select("*").in("status", ["pending", "live"]).order("run_at", { ascending: true });
  for (const r of (data ?? []) as ScheduledRow[]) {
    const endsMs = r.ends_at ? Date.parse(r.ends_at) : null;
    if (r.status === "pending" && Date.parse(r.run_at) <= now) {
      if (endsMs !== null && endsMs <= now) { // the whole window passed before we ran (e.g. the scheduler was down)
        await db.from("scheduled_changes").update({ status: "done", result: "Skipped: the end time had already passed" }).eq("id", r.id).eq("status", "pending");
        out.skipped++; continue;
      }
      const claim = await db.from("scheduled_changes").update({ status: endsMs === null ? "done" : "live" }).eq("id", r.id).eq("status", "pending").select("id");
      if (!(claim.data as unknown[] | null)?.length) continue; // someone else has it
      try {
        const a = await applyStart(db, r);
        await db.from("scheduled_changes").update({ result: a.note, before: a.before ?? null, applied_at: iso(now) }).eq("id", r.id);
        out.started++;
      } catch (e) {
        await db.from("scheduled_changes").update({ status: "failed", result: e instanceof Error ? e.message : "Failed" }).eq("id", r.id);
        out.failed++;
      }
    } else if (r.status === "live" && endsMs !== null && endsMs <= now) {
      const claim = await db.from("scheduled_changes").update({ status: "done" }).eq("id", r.id).eq("status", "live").select("id");
      if (!(claim.data as unknown[] | null)?.length) continue;
      try { await db.from("scheduled_changes").update({ result: await applyEnd(db, r) }).eq("id", r.id); out.ended++; }
      catch (e) { await db.from("scheduled_changes").update({ status: "failed", result: e instanceof Error ? e.message : "Failed" }).eq("id", r.id); out.failed++; }
    }
  }
  return out;
}
