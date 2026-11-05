import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SignOutButton } from "@/components/SignOutButton";
import { getAdmin } from "@/lib/admin/auth";
import { sessionClient } from "@/lib/db/clients";
import type { OrderRow } from "@/lib/shop/fulfil";
import { formatPrice } from "@/lib/site";

export const metadata: Metadata = { title: "My Sparkthunder ID", robots: { index: false, follow: false } };
const STATUS = { paid: "Being prepared", shipped: "Shipped", cancelled: "Cancelled", attention: "Being prepared" } as const;

export default async function AccountPage() {
  await connection();
  const db = await sessionClient();
  const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };
  const user = data.user;
  if (!db || !user) redirect("/account/login?next=/account");
  const name = (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || "";
  const { data: rows } = await db.from("orders").select("*").eq("email", user.email ?? "").order("created_at", { ascending: false });
  const orders = (rows ?? []) as OrderRow[];
  const admin = await getAdmin();
  return (
    <div className="pt-12">
      <h1 className="display text-[clamp(2rem,4.2vw,3.25rem)]">{name ? `Hello, ${name.split(" ")[0]}` : "My Sparkthunder ID"}</h1>
      <p className="mt-2 text-muted">{user.email}</p>
      <div className="mt-6 flex flex-wrap gap-3"><SignOutButton />{admin ? <Link href="/admin" className="btn btn-ink">Open the admin</Link> : null}</div>

      <section className="mt-12" aria-labelledby="orders-h">
        <h2 id="orders-h" className="display text-2xl sm:text-3xl">Your orders</h2>
        {orders.length === 0 ? <p className="mt-4 text-muted">No orders yet. <Link href="/shop" className="font-bold underline underline-offset-4">Start shopping</Link>.</p> : (
          <ul className="mt-5 divide-y divide-ink/15 border-y border-ink/15">
            {orders.map((o) => (
              <li key={o.id} className="py-4">
                <p className="flex flex-wrap justify-between gap-2"><b>{o.number}</b><span>{formatPrice(o.total_pence + o.gift_card_pence)}</span></p>
                <p className="text-sm text-muted">{new Date(o.created_at).toLocaleDateString("en-GB")} · {STATUS[o.status]}{o.tracking_number ? ` · ${o.tracking_carrier} ${o.tracking_number}` : ""}</p>
                <p className="mt-1 text-sm">{o.items.map((l) => `${l.name} × ${l.qty}`).join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-10 max-w-xl text-sm text-muted">Your Sparkthunder ID is shared across our sites, so the same email and password (or Google account) works everywhere it is offered.</p>
    </div>
  );
}
