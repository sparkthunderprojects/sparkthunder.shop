"use server";

import { logActivity as audit } from "@/lib/admin/activity";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { serviceClient } from "@/lib/db/clients";
import { awardPoints } from "@/lib/rewards";

export async function adjustPointsAction(email: string, points: number, note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminAction("marketing");
    const e = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "Enter the customer's email address." };
    const n = Math.round(Number(points));
    if (!n) return { ok: false, error: "Enter a number of points (use a minus sign to take points away)." };
    const db = serviceClient();
    if (!db) return { ok: false, error: "Rewards are not available yet." };
    const ok = await awardPoints(db, { email: e, points: n, reason: "adjust", ref: `admin-${Date.now()}`, note: note.trim().slice(0, 120) || "Adjustment from Sparkthunder" });
    if (!ok) return { ok: false, error: "The points could not be saved." };
    revalidatePath("/admin/rewards");
    await audit("points.adjust", `Adjusted Spark points by ${points}`, { type: "points", id: email, meta: { points, note } });
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." }; }
}
