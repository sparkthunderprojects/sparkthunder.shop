"use server";

import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { revalidatePath } from "next/cache";
import { serviceClient, sessionClient } from "@/lib/db/clients";
import { redeemPoints } from "@/lib/rewards";

export async function redeemPointsAction(optionIndex: number): Promise<{ ok: true; code: string; pence: number } | { ok: false; error: string }> {
  const s = await sessionClient();
  const { data } = (await s?.auth.getUser()) ?? { data: { user: null } };
  const email = data.user?.email;
  if (!email) return { ok: false, error: "Please sign in first." };
  if (!(await rateLimit("points", LIMITS.points, email)).ok) return { ok: false, error: "Too many attempts. Please try again later." };
  const db = serviceClient();
  if (!db) return { ok: false, error: "Rewards are not available yet." };
  const r = await redeemPoints(db, email, Number(optionIndex));
  if (r.ok) revalidatePath("/account");
  return r;
}
