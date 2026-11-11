"use server";

import { revalidatePath } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { returnStatusEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import type { ReturnRow, ReturnStatus } from "@/lib/returns";

type Result = { ok: true; note?: string } | { ok: false; error: string };

const ORDER: ReturnStatus[] = ["requested", "approved", "received", "refunded"];

/** Move a return along. Approving, rejecting, receiving and refunding each email the customer (with your note, if any). */
export async function setReturnStatusAction(id: string, status: ReturnStatus, note: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { data } = await db.from("return_requests").select("*").eq("id", id).maybeSingle();
    const r = data as ReturnRow | null;
    if (!r) return { ok: false, error: "Return not found." };
    if (r.status === "rejected" || r.status === "refunded") return { ok: false, error: "This return is already closed." };
    if (status !== "rejected" && ORDER.indexOf(status) <= ORDER.indexOf(r.status)) return { ok: false, error: "That step has already been done." };
    const clean = note.trim().slice(0, 1000);
    const { error } = await db.from("return_requests").update({ status, admin_note: clean || r.admin_note, resolved_at: status === "rejected" || status === "refunded" ? new Date().toISOString() : null }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/returns");
    await audit("return.status", `Return for order ${r.order_number} is now ${status}`, { type: "return", id });
    if (status === "requested") return { ok: true };
    const sent = await sendEmail({ to: r.email, ...returnStatusEmail({ number: r.order_number, name: r.name, status, note: clean || (status === "refunded" ? "" : r.admin_note) }) });
    return { ok: true, note: sent.ok ? "Saved and the customer was emailed." : `Saved, but the email failed: ${sent.error}` };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
