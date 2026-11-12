"use server";

import { revalidatePath } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { bustTag } from "@/lib/tags";
import { CATALOG_TAG } from "@/lib/catalog";
import { isProductAction, runScheduled, SCHEDULE_ACTIONS, type ScheduleAction } from "@/lib/schedule";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export type ScheduleInput = { action: ScheduleAction; target: string; runAt: string; endsAt: string; percentOff: number };

export async function createScheduleAction(i: ScheduleInput): Promise<Result> {
  try {
    const { db } = await requireAdminAction("catalogue");
    if (!SCHEDULE_ACTIONS.includes(i.action)) return { ok: false, error: "Choose what to schedule." };
    const run = Date.parse(i.runAt), end = i.endsAt ? Date.parse(i.endsAt) : null;
    if (!Number.isFinite(run)) return { ok: false, error: "Choose the date and time it should happen." };
    if (run < Date.now() - 120_000) return { ok: false, error: "That time has already passed. Choose a time in the future." };
    if (end !== null && (!Number.isFinite(end) || end <= run)) return { ok: false, error: "The end time must be after the start time." };
    const table = isProductAction(i.action) ? "products" : "collections";
    const { data: found } = await db.from(table).select("slug").eq("slug", i.target).maybeSingle();
    if (!found) return { ok: false, error: `Choose a ${table === "products" ? "product" : "collection"} from the list.` };
    let percent: number | null = null;
    if (i.action === "sale") {
      percent = Math.round(i.percentOff);
      if (!(percent >= 1 && percent <= 90)) return { ok: false, error: "A sale must take between 1% and 90% off." };
      if (end === null) return { ok: false, error: "Give the sale an end time so prices go back by themselves." };
      const { data: others } = await db.from("scheduled_changes").select("run_at, ends_at").eq("action", "sale").eq("target", i.target).in("status", ["pending", "live"]);
      for (const o of (others ?? []) as { run_at: string; ends_at: string | null }[]) {
        const os = Date.parse(o.run_at), oe = o.ends_at ? Date.parse(o.ends_at) : Infinity;
        if (run < oe && (end ?? Infinity) > os) return { ok: false, error: "This product already has a sale planned that overlaps those dates. Cancel it first." };
      }
    }
    const { error } = await db.from("scheduled_changes").insert({ action: i.action, target: i.target, run_at: new Date(run).toISOString(), ends_at: end === null ? null : new Date(end).toISOString(), percent_off: percent, status: "pending" });
    if (error) return { ok: false, error: `${error.message}. Run the latest supabase/admin.sql.` };
    revalidatePath("/admin/schedule");
    await audit("schedule.create", `Scheduled ${i.action} for ${i.target}`, { type: "schedule" });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function cancelScheduleAction(id: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction("catalogue");
    const { data } = await db.from("scheduled_changes").update({ status: "cancelled", result: "Cancelled" }).eq("id", id).eq("status", "pending").select("id");
    if (!(data as unknown[] | null)?.length) return { ok: false, error: "Only changes that have not started yet can be cancelled." };
    revalidatePath("/admin/schedule");
    await audit("schedule.cancel", "Cancelled a scheduled change", { type: "schedule" });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

/** Apply anything already due, without waiting for the scheduler. */
export async function runScheduleNowAction(): Promise<Result<{ summary: string }>> {
  try {
    const { db } = await requireAdminAction("catalogue");
    const r = await runScheduled(db);
    if (r.started || r.ended) { await bustTag(CATALOG_TAG); revalidatePath("/", "layout"); }
    revalidatePath("/admin/schedule");
    const parts = [r.started && `${r.started} started`, r.ended && `${r.ended} ended`, r.failed && `${r.failed} failed`, r.skipped && `${r.skipped} skipped`].filter(Boolean);
    return { ok: true, summary: parts.length ? parts.join(", ") : "Nothing was due." };
  } catch (e) { return { ok: false, error: message(e) }; }
}
