"use server";

import { getAllProducts } from "@/lib/catalog";
import { serviceClient } from "@/lib/db/clients";
import { rateLimit, LIMITS, wait } from "@/lib/ratelimit";
import { isUnsubscribed } from "@/lib/lifecycle";
import { BASKET_CONSENT } from "@/lib/consent-text";
import type { CartInput } from "@/lib/shop/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The customer ticked the box and asked for one reminder email about this basket. Prices come from the catalogue, not the browser. */
export async function saveBasketAction(cart: CartInput, rawEmail: string, consent: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!consent) return { ok: false, error: "Please tick the box to say you want the reminder." };
    const email = String(rawEmail ?? "").trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "Please enter a valid email address." };
    const rl = await rateLimit("newsletter", LIMITS.newsletter);
    if (!rl.ok) return { ok: false, error: `Too many requests. Please wait ${wait(rl)} and try again.` };
    const db = serviceClient();
    if (!db) return { ok: false, error: "Reminders are not available yet." };
    if (await isUnsubscribed(db, email)) return { ok: true }; // never reveal who has unsubscribed
    const catalogue = new Map((await getAllProducts()).map((p) => [p.slug, p]));
    const lines = cart.flatMap((i) => {
      const [slug, variant] = String(i.slug).split("::");
      const p = catalogue.get(slug);
      if (!p) return [];
      const v = (p.variants ?? []).find((x) => x.name === variant);
      return [{ slug: p.slug, name: v ? `${p.name} (${v.name})` : p.name, qty: Math.min(20, Math.max(1, Math.floor(Number(i.qty) || 1))), pricePence: v?.pricePence ?? p.pricePence }];
    }).slice(0, 20);
    if (!lines.length) return { ok: false, error: "Your basket is empty." };
    await db.from("basket_saves").delete().eq("email", email).is("reminded_at", null); // one open reminder per person
    const { error } = await db.from("basket_saves").insert({ email, cart: lines, subtotal_pence: lines.reduce((n, l) => n + l.pricePence * l.qty, 0), consent_text: BASKET_CONSENT });
    if (error) return { ok: false, error: "We could not save that right now. Please try again." };
    return { ok: true };
  } catch { return { ok: false, error: "We could not save that right now. Please try again." }; }
}
