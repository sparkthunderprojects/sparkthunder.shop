import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import type { OrderRow } from "@/lib/shop/fulfil";
import type { RefundRow } from "@/lib/shop/refund";
import { OrderDetail } from "./OrderDetail";
import { RefundPanel } from "./RefundPanel";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { data: refunds } = await db.from("order_refunds").select("*").eq("order_id", id).order("created_at", { ascending: true });
  const order = data as OrderRow;
  return (
    <>
      <OrderDetail order={order} />
      {order.fulfilled_at && (order.total_pence > 0 || order.gift_card_pence > 0) ? <RefundPanel order={order} refunds={(refunds ?? []) as RefundRow[]} /> : null}
    </>
  );
}
