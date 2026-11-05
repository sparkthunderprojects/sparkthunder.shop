import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import type { OrderRow } from "@/lib/shop/fulfil";
import { OrderDetail } from "./OrderDetail";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <OrderDetail order={data as OrderRow} />;
}
