import type { ReturnRow } from "@/lib/returns";

/** A return as the API shows it (no internal notes). */
export const publicReturn = (r: Pick<ReturnRow, "id" | "order_number" | "email" | "name" | "items" | "reason" | "details" | "status" | "created_at" | "resolved_at">) => ({
  id: r.id, order: r.order_number, status: r.status, reason: r.reason, details: r.details, items: r.items,
  customer: { email: r.email, name: r.name }, created_at: r.created_at, resolved_at: r.resolved_at,
});
