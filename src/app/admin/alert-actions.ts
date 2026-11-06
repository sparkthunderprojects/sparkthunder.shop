"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { notifyBackInStock } from "@/lib/shop/alerts";

export async function sendRestockEmailsAction(): Promise<{ ok: true; sent: number; failed: number } | { ok: false; error: string }> {
  try {
    const { db } = await requireAdminAction();
    const r = await notifyBackInStock(db);
    revalidatePath("/admin/stock-alerts");
    if (r.failed && !r.sent) return { ok: false, error: r.firstError ?? "The emails could not be sent." };
    return { ok: true, sent: r.sent, failed: r.failed };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
