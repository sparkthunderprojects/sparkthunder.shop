import { requireAdmin } from "@/lib/admin/auth";
import { serviceClient } from "@/lib/db/clients";
import type { ReviewRow } from "@/lib/reviews";
import { ReviewModeration } from "./ReviewModeration";

export const metadata = { title: "Reviews" };

export default async function ReviewsAdmin() {
  const { db } = await requireAdmin();
  // Buyer emails are not readable by browser-side roles, so the (already verified) admin page reads them with the server key.
  const { data } = await (serviceClient() ?? db).from("reviews").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as ReviewRow[];
  const pending = rows.filter((r) => r.status === "pending").length;
  return (
    <>
      <div className="adm-h"><div><h1>Reviews</h1><p>Only customers who bought a product can review it. Approve a review to publish it (with its photos) on the product page and in search results.{pending ? ` ${pending} waiting for you.` : ""}</p></div></div>
      <ReviewModeration rows={rows} />
    </>
  );
}
