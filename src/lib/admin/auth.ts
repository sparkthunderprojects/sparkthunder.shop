import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sessionClient, type Db } from "@/lib/db/clients";
import { hasSupabase, isDemo } from "@/lib/db/env";
import { currentStoreId } from "@/lib/db/stores";
import { can, isRole, permsForRole, type Perms, type Permission, type Role } from "@/lib/admin/roles";

/** `access` is "*" for owners (every store) or the ids of the stores a staff member may manage. */
export type AdminSession = { db: Db; email: string; demo: boolean; access: string[] | "*"; /** Staff role per store id (owners have none: they can do everything). */ roles: Record<string, Role> };

/** The signed-in admin for this request, or null. Row-level security is the real gate; this is the UX check. */
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  const db = await sessionClient();
  if (!db) return null;
  if (isDemo) return { db, email: "demo@sparkthunder.shop", demo: true, access: "*", roles: {} };
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: row } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (row) return { db, email: user.email ?? "", demo: false, access: "*", roles: {} };
  const { data: staff } = await db.from("store_admins").select("store_id, role").eq("user_id", user.id);
  const list = (staff ?? []) as { store_id: string; role?: string }[];
  const roles = Object.fromEntries(list.map((s) => [s.store_id, isRole(s.role) ? s.role : "manager"])) as Record<string, Role>; // staff added before roles existed keep full access
  return list.length ? { db, email: user.email ?? "", demo: false, access: list.map((s) => s.store_id), roles } : null;
});

/** What this admin may do in the store being edited right now. */
export async function permsHere(admin: AdminSession): Promise<Perms> {
  if (admin.access === "*") return "*";
  return permsForRole(admin.roles[await currentStoreId()]);
}

/** For pages. With a permission, staff whose role lacks it are sent back to the dashboard. */
export async function requireAdmin(perm?: Permission): Promise<AdminSession> {
  await connection(); // admin pages are always per-request, never prerendered
  if (!hasSupabase && !isDemo) redirect("/admin/login");
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (perm && !can(await permsHere(admin), perm)) redirect(`/admin?denied=${perm}`);
  return admin;
}

/** For server actions: throw instead of redirecting so the client gets a clear failure. */
export async function requireAdminAction(perm?: Permission): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not signed in as an admin.");
  if (perm && !can(await permsHere(admin), perm)) throw new Error("Your role does not allow that. Ask a store manager or owner.");
  return admin;
}

/** Owner-only actions (creating stores, managing staff). */
export async function requireOwnerAction(): Promise<AdminSession> {
  const admin = await requireAdminAction();
  if (admin.access !== "*") throw new Error("Only owners can do that.");
  return admin;
}
