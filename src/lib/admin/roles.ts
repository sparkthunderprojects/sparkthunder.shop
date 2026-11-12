/** What a staff member can do in a store. Owners (platform admins) can do everything everywhere. */
export type Role = "manager" | "fulfilment" | "support" | "editor";
export type Permission = "orders" | "refunds" | "catalogue" | "content" | "marketing" | "settings" | "reports";

export const ROLE_PERMS: Record<Role, Permission[]> = {
  manager: ["orders", "refunds", "catalogue", "content", "marketing", "settings", "reports"],
  fulfilment: ["orders"],
  support: ["orders", "content"],
  editor: ["catalogue", "content"],
};
export const ROLES = Object.keys(ROLE_PERMS) as Role[];
export const ROLE_LABEL: Record<Role, string> = { manager: "Manager (everything in the store)", fulfilment: "Fulfilment (orders and returns)", support: "Support (orders, returns, reviews and questions)", editor: "Editor (products, categories, media, reviews and questions)" };
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as string[]).includes(v);

export type Perms = Permission[] | "*";
export const can = (perms: Perms, p: Permission) => perms === "*" || perms.includes(p);
export const permsForRole = (r: Role | undefined): Permission[] => (r ? ROLE_PERMS[r] : []);

const PATHS: [string, Permission][] = [
  ["/admin/orders", "orders"], ["/admin/returns", "orders"],
  ["/admin/products", "catalogue"], ["/admin/franchises", "catalogue"], ["/admin/categories", "catalogue"], ["/admin/collections", "catalogue"], ["/admin/media", "catalogue"],
  ["/admin/stock-alerts", "catalogue"], ["/admin/schedule", "catalogue"], ["/admin/redirects", "catalogue"], ["/admin/seo", "catalogue"], ["/admin/universe-sites", "catalogue"],
  ["/admin/reviews", "content"], ["/admin/questions", "content"],
  ["/admin/discounts", "marketing"], ["/admin/promotions", "marketing"], ["/admin/gift-cards", "marketing"], ["/admin/rewards", "marketing"],
  ["/admin/commerce", "settings"], ["/admin/store", "settings"], ["/admin/settings", "settings"], ["/admin/printify", "settings"], ["/admin/developers", "settings"], ["/admin/health", "settings"], ["/admin/activity", "settings"],
  ["/admin/sales", "reports"], ["/admin/overview", "reports"],
];
/** The permission a admin page needs (null = every signed-in staff member, like the dashboard). Longest prefix wins, so /admin/store never matches /admin/stores. */
export function permForPath(path: string): Permission | null {
  const hit = PATHS.find(([p]) => path === p || path.startsWith(p + "/"));
  return hit ? hit[1] : null;
}
