import { isUpcoming } from "@/lib/launch";
import { getAllProducts } from "@/lib/catalog";
import type { Db } from "@/lib/db/clients";
import { isGiftCardLine } from "@/lib/giftcards/format";
import { GIFT_LIMITS, getCardByCode, effectiveStatus } from "@/lib/giftcards/ledger";
import { isGiftThemeId } from "@/lib/giftcards/themes";
import { checkDiscount } from "@/lib/discounts";
import { absoluteUrl, formatPrice } from "@/lib/site";
import { getCommerce, quoteShipping } from "@/lib/commerce";
import { orderVat } from "@/lib/vat";
import { getStore } from "@/lib/store";
import type { CartInput, GiftOptionsInput, Snapshot, SnapshotLine } from "./types";

export const MIN_CHARGE_PENCE = 30; // Stripe's minimum card charge in GBP

/**
 * Turn the browser's basket into a trusted order plan. Product prices and names come from the catalogue,
 * never from the client; gift card amounts are range-checked; a gift card code is verified and capped.
 */
export async function buildPlan(db: Db, cart: CartInput, giftCode: string | null, discountCode: string | null = null, giftOpts: GiftOptionsInput | null = null, country: string | null = null): Promise<{ ok: true; snapshot: Snapshot } | { ok: false; error: string }> {
  if (!cart.length) return { ok: false, error: "Your basket is empty." };
  const commerce = await getCommerce();
  const GIFT_WRAP_PENCE = commerce.giftWrapPence;
  const catalogue = new Map((await getAllProducts()).map((p) => [p.slug, p]));
  const lines: SnapshotLine[] = [];
  const franchiseOf = new Map<string, string>(); // product slug -> universe, for universe-only discount codes
  for (const item of cart) {
    const qty = Math.min(20, Math.max(1, Math.floor(Number(item.qty) || 0)));
    if (isGiftCardLine(item.slug)) {
      const amount = Math.round(Number(item.pricePence));
      if (!item.gift || !Number.isInteger(amount) || amount < GIFT_LIMITS.min || amount > GIFT_LIMITS.max) return { ok: false, error: "A gift card in your basket is invalid. Remove it and add it again." };
      const email = String(item.gift.recipientEmail ?? "").trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "A gift card in your basket has no valid email address." };
      lines.push({ type: "gift", name: `${(await getStore()).name} gift card ${formatPrice(amount)}`, unitPence: amount, qty, gift: {
        recipientName: String(item.gift.recipientName ?? "").slice(0, 40), recipientEmail: email.toLowerCase(), senderName: String(item.gift.senderName ?? "").slice(0, 40),
        message: String(item.gift.message ?? "").slice(0, 200), theme: isGiftThemeId(item.gift.theme) ? item.gift.theme : "brand",
      } });
      continue;
    }
    const [baseSlug, variantName] = String(item.slug).split("::");
    const p = catalogue.get(baseSlug);
    if (!p) return { ok: false, error: "An item in your basket is no longer available. Please remove it and try again." };
    if (isUpcoming(p.launchAt)) return { ok: false, error: `${p.name} is not on sale yet. It launches ${new Date(p.launchAt!).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} UTC.` };
    if (!p.inStock) return { ok: false, error: `${p.name} is sold out.` };
    const hasVariants = (p.variants ?? []).length > 0;
    const variant = variantName ? (p.variants ?? []).find((v) => v.name === variantName) : undefined;
    if (hasVariants && !variant) return { ok: false, error: `Please choose an option for ${p.name}: remove it from your basket and add it again.` };
    if (variantName && !hasVariants) return { ok: false, error: `${p.name} has changed. Please remove it and add it again.` };
    const label = variant ? `${p.name} (${variant.name})` : p.name;
    if (p.trackStock) {
      const left = variant ? variant.stockQty : p.stockQty ?? 0;
      if (left < qty) return { ok: false, error: left <= 0 ? `${label} is sold out.` : `Only ${left} of ${label} left in stock.` };
    }
    franchiseOf.set(p.slug, p.franchiseSlug);
    lines.push({ type: "product", slug: p.slug, ...(variant ? { variant: variant.name } : {}), name: label, sku: variant?.sku || p.sku, unitPence: variant?.pricePence ?? p.pricePence, qty, image: (variant?.image || p.images[0]) ? ((variant?.image || p.images[0]).startsWith("http") ? (variant?.image || p.images[0]) : absoluteUrl(variant?.image || p.images[0])) : "" });
  }
  const productSubtotal = lines.filter((l) => l.type === "product").reduce((n, l) => n + l.unitPence * l.qty, 0);
  const subtotalPence = lines.reduce((n, l) => n + l.unitPence * l.qty, 0);
  const needsShipping = productSubtotal > 0;
  const deliverTo = (country ?? commerce.shippingCountries[0] ?? "GB").toUpperCase();
  const itemCount = lines.reduce((n, l) => n + (l.type === "product" ? l.qty : 0), 0);
  const quote = needsShipping ? quoteShipping(commerce, deliverTo, itemCount, productSubtotal) : null;
  if (quote && !quote.ok) return { ok: false, error: quote.error };
  const shippingPence = quote?.ok ? quote.pence : 0;

  let discount: Snapshot["discount"] = null;
  if (discountCode) {
    const check = await checkDiscount(db, discountCode, lines.flatMap((l) => (l.type === "product" ? [{ franchiseSlug: franchiseOf.get(l.slug) ?? "", totalPence: l.unitPence * l.qty }] : [])));
    if (!check.ok) return { ok: false, error: `${check.error} Remove the code from your basket to continue.` };
    discount = { id: check.row.id, code: check.row.code, appliedPence: check.amountPence };
  }
  const payableProducts = productSubtotal - (discount?.appliedPence ?? 0);

  let giftCard: Snapshot["giftCard"] = null;
  if (giftCode) {
    const card = await getCardByCode(db, giftCode);
    const status = card ? effectiveStatus(card) : "disabled";
    if (!card || status !== "active") return { ok: false, error: "That gift card cannot be used. Remove it from your basket to continue." };
    const applied = Math.min(card.balance_pence, payableProducts); // a gift card cannot buy another gift card
    if (applied > 0) giftCard = { cardId: card.id, code: card.code, appliedPence: applied };
  }
  // Gift options only make sense for something we post.
  const giftMessage = needsShipping ? String(giftOpts?.message ?? "").replace(/\s+/g, " ").trim().slice(0, 200) : "";
  const wrap = needsShipping && giftOpts?.wrap === true;
  const giftOptions: Snapshot["giftOptions"] = wrap || giftMessage ? { message: giftMessage, wrap, wrapPence: wrap ? GIFT_WRAP_PENCE : 0 } : null;
  const totalPence = subtotalPence + shippingPence + (giftOptions?.wrapPence ?? 0) - (discount?.appliedPence ?? 0) - (giftCard?.appliedPence ?? 0);
  if (totalPence > 0 && totalPence < MIN_CHARGE_PENCE) return { ok: false, error: `After your discounts the amount left to pay is ${formatPrice(totalPence)}. Card payments must be at least ${formatPrice(MIN_CHARGE_PENCE)}, so add another item or remove the gift card or code.` };
  return { ok: true, snapshot: { lines, subtotalPence, shippingPence, needsShipping, ...(quote?.ok ? { country: deliverTo, shippingZone: quote.zone } : {}), discount, giftOptions, giftCard, totalPence, vat: orderVat({ lines, shippingPence, giftOptions, discount }, commerce) } };
}
