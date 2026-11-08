import { getAdmin } from "@/lib/admin/auth";
import { serviceClient } from "@/lib/db/clients";

export type ActivityRow = { id: string; store_id: string; actor: string; action: string; target_type: string; target_id: string; summary: string; meta: Record<string, unknown>; created_at: string };

/**
 * Record that something was changed in the admin: who, what and when. Add-only (there is no way to edit or delete history from the browser).
 * Never throws and never blocks the action: if the record cannot be written, the failure is logged and the work carries on.
 * Never put secrets (keys, passwords) in `summary` or `meta`; say that they changed, not what they are.
 */
export async function logActivity(action: string, summary: string, o: { type?: string; id?: string; meta?: Record<string, unknown>; actor?: string; storeId?: string } = {}): Promise<void> {
  try {
    const actor = o.actor ?? (await getAdmin())?.email ?? "unknown";
    const db = serviceClient(o.storeId);
    if (!db) return;
    const { error } = await db.from("audit_log").insert({
      actor, action, summary: summary.slice(0, 400), target_type: o.type ?? "", target_id: String(o.id ?? "").slice(0, 120), meta: o.meta ?? {},
    });
    if (error) console.error("[activity log] could not record", action, error.message);
  } catch (e) { console.error("[activity log] could not record", action, e instanceof Error ? e.message : e); }
}
