import type { Db } from "@/lib/db/clients";
import { serviceClient } from "@/lib/db/clients";
import { buildCustomers, type Customer, type CustomerNote, type OrderForCustomer } from "@/lib/customers";

const LIMIT = 20_000;
/** Reads everything the customer list is built from. Spark points sit in a table the shop client may not read, so the service client is used where there is one. */
export async function loadCustomers(db: Db): Promise<Customer[]> {
  const svc = serviceClient() ?? db;
  const [o, s, p, r, v, n] = await Promise.all([
    db.from("orders").select("id, number, email, name, phone, shipping_address, status, total_pence, refunded_card_pence, refunded_gift_pence, created_at").order("created_at", { ascending: false }).limit(LIMIT),
    db.from("subscribers").select("email").limit(LIMIT),
    svc.from("reward_points").select("email, points").limit(LIMIT),
    db.from("return_requests").select("email").limit(LIMIT),
    db.from("reviews").select("email").limit(LIMIT),
    db.from("customer_notes").select("email, tags, notes").limit(LIMIT),
  ]);
  const rows = <T,>(x: { data: unknown }) => (x.data ?? []) as T[];
  return buildCustomers({
    orders: rows<OrderForCustomer>(o), subscribers: rows<{ email: string }>(s).map((x) => x.email), points: rows<{ email: string; points: number }>(p),
    returns: rows<{ email: string }>(r).map((x) => x.email), reviews: rows<{ email: string }>(v).map((x) => x.email), notes: rows<CustomerNote>(n),
  });
}
