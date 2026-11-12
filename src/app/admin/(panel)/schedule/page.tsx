import { requireAdmin } from "@/lib/admin/auth";
import type { ScheduledRow } from "@/lib/schedule";
import { ScheduleManager } from "./ScheduleManager";

export const metadata = { title: "Scheduled changes" };

export default async function ScheduleAdmin() {
  const { db } = await requireAdmin("catalogue");
  const [{ data: rows }, { data: products }, { data: collections }] = await Promise.all([
    db.from("scheduled_changes").select("*").order("run_at", { ascending: false }).limit(100),
    db.from("products").select("slug, name").order("name"),
    db.from("collections").select("slug, name").order("name"),
  ]);
  return (
    <>
      <div className="adm-h"><div><h1>Scheduled changes</h1><p>Plan drops and sales ahead of time: show or hide a product or collection, or run a timed sale. Changes are applied by the scheduler (every 30 minutes), so allow up to half an hour.</p></div></div>
      <ScheduleManager rows={(rows ?? []) as ScheduledRow[]} products={(products ?? []) as { slug: string; name: string }[]} collections={(collections ?? []) as { slug: string; name: string }[]} />
    </>
  );
}
