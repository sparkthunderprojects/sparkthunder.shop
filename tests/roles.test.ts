import { describe, expect, it } from "vitest";
import { can, isRole, permForPath, permsForRole, ROLE_PERMS } from "@/lib/admin/roles";

describe("staff roles", () => {
  it("fulfilment staff handle orders but cannot refund, edit products or see settings and reports", () => {
    const p = permsForRole("fulfilment");
    expect(can(p, "orders")).toBe(true);
    for (const x of ["refunds", "catalogue", "marketing", "settings", "reports"] as const) expect(can(p, x)).toBe(false);
  });
  it("support can answer customers but not refund; editors manage the catalogue but not money", () => {
    expect(can(permsForRole("support"), "content")).toBe(true);
    expect(can(permsForRole("support"), "refunds")).toBe(false);
    expect(can(permsForRole("editor"), "catalogue")).toBe(true);
    expect(can(permsForRole("editor"), "orders")).toBe(false);
    expect(can(permsForRole("editor"), "marketing")).toBe(false);
  });
  it("managers can do everything in their store, owners everywhere, unknown roles nothing", () => {
    expect(ROLE_PERMS.manager).toHaveLength(8);
    expect(can("*", "settings")).toBe(true);
    expect(permsForRole(undefined)).toEqual([]);
    expect(isRole("manager")).toBe(true); expect(isRole("admin")).toBe(false);
  });
  it("maps every admin page to a permission, with money and settings pages kept off lower roles", () => {
    expect(permForPath("/admin/orders/abc")).toBe("orders");
    expect(permForPath("/admin/returns")).toBe("orders");
    expect(permForPath("/admin/products/import")).toBe("catalogue");
    expect(permForPath("/admin/discounts")).toBe("marketing");
    expect(permForPath("/admin/printify")).toBe("settings");
    expect(permForPath("/admin/sales")).toBe("reports");
    expect(permForPath("/admin/store")).toBe("settings");
    expect(permForPath("/admin/stores")).toBeNull(); // owner-only, checked separately
    expect(permForPath("/admin")).toBeNull();
  });
});
