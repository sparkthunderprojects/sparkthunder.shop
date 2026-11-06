"use server";

import { headers } from "next/headers";
import { getProduct } from "@/lib/catalog";
import { serviceClient } from "@/lib/db/clients";
import { isAvailable } from "@/lib/shop/alerts";

// Brake on form abuse: 6 sign-ups a minute per client (per server instance, in memory).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 6;
}

export type AlertResult = { ok: true } | { ok: false; error: string };

/** "Email me when it's back": remembers one email for one sold-out product (or one option of it). */
export async function subscribeStockAlertAction(slug: string, variant: string, rawEmail: string): Promise<AlertResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (limited(ip)) return { ok: false, error: "Too many requests. Please wait a minute and try again." };
  const email = String(rawEmail ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email address does not look right." };
  const product = await getProduct(String(slug));
  if (!product) return { ok: false, error: "We could not find that product." };
  const v = String(variant ?? "");
  if (v && !(product.variants ?? []).some((x) => x.name === v)) return { ok: false, error: "We could not find that option." };
  if (isAvailable(product, v)) return { ok: false, error: "Good news: that is in stock right now, so you can buy it." };
  const db = serviceClient();
  if (!db) return { ok: false, error: "Stock alerts are not available yet." };
  const existing = await db.from("stock_alerts").select("id").eq("product_slug", product.slug).eq("variant", v).eq("email", email).maybeSingle();
  if (existing.data) {
    // Already asked: start the wait again (so someone who was told earlier can ask a second time).
    await db.from("stock_alerts").update({ notified_at: null }).eq("id", (existing.data as { id: string }).id);
    return { ok: true };
  }
  const { error } = await db.from("stock_alerts").insert({ product_slug: product.slug, variant: v, email, created_at: new Date().toISOString(), notified_at: null });
  if (error && !/duplicate|unique/i.test(error.message)) return { ok: false, error: "We could not save that. Please try again." };
  return { ok: true };
}
