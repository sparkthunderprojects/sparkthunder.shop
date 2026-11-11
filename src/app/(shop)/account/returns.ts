"use server";

import { revalidatePath } from "next/cache";
import { notifyOwner } from "@/lib/alerts";
import { serviceClient, sessionClient } from "@/lib/db/clients";
import { rateLimit, LIMITS, wait } from "@/lib/ratelimit";
import { createReturn, type ReturnInput } from "@/lib/returns";
import type { OrderRow } from "@/lib/shop/fulfil";
import { currentStoreId } from "@/lib/db/stores";

/** A signed-in customer asks to return items from one of their own orders. */
export async function requestReturnAction(orderId: string, input: ReturnInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const rl = await rateLimit("returns", LIMITS.returns);
    if (!rl.ok) return { ok: false, error: `Too many requests. Please wait ${wait(rl)} and try again.` };
    const session = await sessionClient();
    const { data } = (await session?.auth.getUser()) ?? { data: { user: null } };
    if (!session || !data.user?.email) return { ok: false, error: "Please sign in again." };
    // Row-level security means this only finds the customer's own orders.
    const { data: row } = await session.from("orders").select("*").eq("id", orderId).maybeSingle();
    const order = row as OrderRow | null;
    if (!order || order.email.toLowerCase() !== data.user.email.toLowerCase()) return { ok: false, error: "We could not find that order." };
    const svc = serviceClient(await currentStoreId());
    if (!svc) return { ok: false, error: "Returns are not available yet." };
    const r = await createReturn(svc, order, input);
    if (!r.ok) return r;
    await notifyOwner(`New return request for order ${order.number}`, `${order.name || order.email} asked to return: ${r.row.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}.\nReason: ${r.row.reason}${r.row.details ? `\n${r.row.details}` : ""}`, `return:${r.row.id}`);
    revalidatePath("/account");
    return { ok: true };
  } catch { return { ok: false, error: "We could not send your request. Please try again." }; }
}
