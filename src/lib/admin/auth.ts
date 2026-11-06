import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sessionClient, type Db } from "@/lib/db/clients";
import { hasSupabase, isDemo } from "@/lib/db/env";

/** `access` is "*" for owners (every store) or the ids of the stores a staff member may manage. */
export type AdminSession = { db: Db; email: string; demo: boolean; access: string[] | "*" };

/** The signed-in admin for this request, or null. Row-level security is the real gate; this is the UX check. */
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  const db = await sessionClient();
  if (!db) return null;
  if (isDemo) return { db, email: "demo@sparkthunder.shop", demo: true, access: "*" };
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: row } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (row) return { db, email: user.email ?? "", demo: false, access: "*" };
  const { data: staff } = await db.from("store_admins").select("store_id").eq("user_id", user.id);
  const ids = ((staff ?? []) as { store_id: string }[]).map((s) => s.store_id);
  return ids.length ? { db, email: user.email ?? "", demo: false, access: ids } : null;
});

export async function requireAdmin(): Promise<AdminSession> {
  await connection(); // admin pages are always per-request, never prerendered
  if (!hasSupabase && !isDemo) redirect("/admin/login");
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For server actions: throw instead of redirecting so the client gets a clear failure. */
export async function requireAdminAction(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not signed in as an admin.");
  return admin;
}

/** Owner-only actions (creating stores, managing staff). */
export async function requireOwnerAction(): Promise<AdminSession> {
  const admin = await requireAdminAction();
  if (admin.access !== "*") throw new Error("Only owners can do that.");
  return admin;
}
