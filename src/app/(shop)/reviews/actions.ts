"use server";

import { currentStoreId } from "@/lib/db/stores";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getProduct } from "@/lib/catalog";
import { serviceClient, sessionClient } from "@/lib/db/clients";
import type { OrderRow } from "@/lib/shop/fulfil";

const hits = new Map<string, number[]>();
function limited(key: string, max: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  list.push(now); hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

export type Eligibility = { state: "anon" | "not_buyer" | "already" | "ok" | "unavailable"; name?: string };

async function buyerEmail() {
  const db = await sessionClient();
  const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };
  const u = data.user;
  return u?.email ? { email: u.email.toLowerCase(), name: ((u.user_metadata?.full_name ?? u.user_metadata?.name ?? "") as string) } : null;
}

async function hasBought(email: string, slug: string) {
  const db = serviceClient();
  if (!db) return null;
  const { data } = await db.from("orders").select("*").eq("email", email);
  const orders = (data ?? []) as OrderRow[];
  return orders.some((o) => o.status !== "cancelled" && o.items.some((l) => l.type === "product" && l.slug === slug));
}

/** Who may review: signed in (Sparkthunder ID) and has bought it. Checked live because product pages are cached. */
export async function reviewEligibilityAction(slug: string): Promise<Eligibility> {
  const who = await buyerEmail();
  if (!who) return { state: "anon" };
  const db = serviceClient();
  if (!db) return { state: "unavailable" };
  const bought = await hasBought(who.email, String(slug));
  if (!bought) return { state: "not_buyer" };
  const dup = await db.from("reviews").select("id").eq("product_slug", String(slug)).eq("email", who.email).maybeSingle();
  return dup.data ? { state: "already" } : { state: "ok", name: who.name.split(" ")[0] ?? "" };
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function submitReviewAction(form: FormData): Promise<ReviewResult> {
  try {
    const slug = String(form.get("slug") ?? "");
    const who = await buyerEmail();
    if (!who) return { ok: false, error: "Please sign in with your Sparkthunder ID to leave a review." };
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (limited(`${who.email}|${ip}`, 5)) return { ok: false, error: "Too many reviews in a short time. Please try again later." };
    const product = await getProduct(slug);
    if (!product) return { ok: false, error: "We could not find that product." };
    const db = serviceClient();
    if (!db) return { ok: false, error: "Reviews are not available yet." };
    if (!(await hasBought(who.email, slug))) return { ok: false, error: "Only customers who bought this product can review it." };
    const dup = await db.from("reviews").select("id").eq("product_slug", slug).eq("email", who.email).maybeSingle();
    if (dup.data) return { ok: false, error: "You have already reviewed this product." };

    const rating = Math.round(Number(form.get("rating")));
    if (!(rating >= 1 && rating <= 5)) return { ok: false, error: "Choose a star rating." };
    const title = String(form.get("title") ?? "").trim().slice(0, 80);
    const body = String(form.get("body") ?? "").trim().slice(0, 2000);
    if (body.length < 10) return { ok: false, error: "Please write at least a sentence about the product." };
    const name = String(form.get("name") ?? "").trim().slice(0, 40) || "Verified buyer";

    const photos: string[] = [];
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
    for (const file of files) {
      if (!/^image\/(webp|jpeg|png)$/.test(file.type)) return { ok: false, error: "Photos must be JPEG, PNG or WebP." };
      if (file.size > 3 * 1024 * 1024) return { ok: false, error: "Each photo must be under 3MB." };
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `${await currentStoreId()}/${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await db.storage.from("review-photos").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (up.error) return { ok: false, error: "A photo could not be uploaded. Please try again." };
      photos.push(db.storage.from("review-photos").getPublicUrl(path).data.publicUrl);
    }

    const { error } = await db.from("reviews").insert({ product_slug: slug, email: who.email, name, rating, title, body, photos, verified: true, status: "pending", created_at: new Date().toISOString() });
    if (error) return { ok: false, error: /duplicate|unique/i.test(error.message) ? "You have already reviewed this product." : "We could not save your review. Please try again." };
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch { return { ok: false, error: "Something went wrong. Please try again." }; }
}
