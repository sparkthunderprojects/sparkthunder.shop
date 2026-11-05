import { formatCode } from "@/lib/giftcards/format";
import type { GiftCard } from "@/lib/giftcards/ledger";
import type { SnapshotLine } from "@/lib/shop/types";
import { SITE, formatPrice } from "@/lib/site";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const THEME: Record<string, string> = { bolt: "#ffd400", knightverge: "#6ea8ff", occult: "#b794f6" };

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0b0b0c"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff"><tr><td style="background:#000;padding:20px 28px;color:#fff;font-weight:800;font-size:20px;letter-spacing:.02em">SPARKTHUNDER <span style="color:#ffd400;font-size:12px;letter-spacing:.3em">SHOP</span></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:22px">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:16px 28px;font-size:12px;color:#6a6a70;border-top:1px solid #e5e5e5">${esc(SITE.legalName)} · <a href="${SITE.url}" style="color:#6a6a70">${SITE.url.replace(/^https?:\/\//, "")}</a></td></tr></table></td></tr></table></body></html>`;
}

export function giftCardEmail(card: Pick<GiftCard, "code" | "initial_pence" | "recipient_name" | "sender_name" | "message" | "theme" | "expires_at">) {
  const code = formatCode(card.code), accent = THEME[card.theme] ?? THEME.bolt, amount = formatPrice(card.initial_pence);
  const from = card.sender_name || "Someone";
  const html = shell(`${esc(from)} sent you a gift card`, `
<p style="margin:0 0 16px">${card.recipient_name ? `Hi ${esc(card.recipient_name)}, ` : ""}you have a ${amount} gift card for the Sparkthunder shop.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0c;color:#fff"><tr><td style="padding:28px">
<div style="color:${accent};font-size:12px;font-weight:700;letter-spacing:.3em">GIFT CARD</div>
<div style="font-size:44px;font-weight:800;color:${accent};margin:8px 0">${amount}</div>
${card.message ? `<div style="font-style:italic;color:#ddd;margin:0 0 12px">&ldquo;${esc(card.message)}&rdquo;</div>` : ""}
<div style="font-family:Consolas,monospace;font-size:20px;letter-spacing:.08em">${code}</div></td></tr></table>
<p style="margin:16px 0">Enter the code at checkout to spend it. Check your balance any time at <a href="${SITE.url}/gift-cards/balance">${SITE.url.replace(/^https?:\/\//, "")}/gift-cards/balance</a>.${card.expires_at ? ` Valid until ${new Date(card.expires_at).toLocaleDateString("en-GB")}.` : ""}</p>
<p style="margin:24px 0 0"><a href="${SITE.url}" style="background:#ffd400;color:#000;padding:12px 22px;text-decoration:none;font-weight:700">Start shopping</a></p>`);
  const text = `${from} sent you a ${amount} Sparkthunder gift card.\n${card.message ? `\n"${card.message}"\n` : ""}\nCode: ${code}\n\nEnter it at checkout at ${SITE.url}. Check your balance: ${SITE.url}/gift-cards/balance\n`;
  return { subject: `${from} sent you a ${amount} Sparkthunder gift card`, html, text };
}

export function orderEmail(o: { number: string; name: string; lines: SnapshotLine[]; subtotalPence: number; shippingPence: number; giftCardPence: number; totalPence: number; address?: Record<string, string> | null; giftCardsIssued: number }) {
  const rows = o.lines.map((l) => `<tr><td style="padding:6px 0">${esc(l.name)} × ${l.qty}</td><td align="right">${formatPrice(l.unitPence * l.qty)}</td></tr>`).join("");
  const addr = o.address ? Object.values(o.address).filter(Boolean).map(esc).join("<br>") : "";
  const html = shell(`Thanks for your order, ${esc(o.name.split(" ")[0] || "fan")}`, `
<p style="margin:0 0 16px">Order <b>${o.number}</b> is confirmed.${o.giftCardsIssued ? " Your gift card is being emailed separately to the recipient." : ""}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5">${rows}
<tr><td style="padding:6px 0;color:#6a6a70">Shipping</td><td align="right">${o.shippingPence ? formatPrice(o.shippingPence) : "Free"}</td></tr>
${o.giftCardPence ? `<tr><td style="padding:6px 0;color:#6a6a70">Gift card</td><td align="right">-${formatPrice(o.giftCardPence)}</td></tr>` : ""}
<tr><td style="padding:10px 0;font-weight:700">Total</td><td align="right" style="font-weight:700">${formatPrice(o.totalPence)}</td></tr></table>
${addr ? `<p style="margin:16px 0 4px;font-weight:700">Shipping to</p><p style="margin:0">${addr}</p>` : ""}
<p style="margin:20px 0 0;color:#6a6a70">We will email you again when your order ships.</p>`);
  const text = `Thanks for your order. Order ${o.number} is confirmed.\n\n${o.lines.map((l) => `${l.name} x ${l.qty}  ${formatPrice(l.unitPence * l.qty)}`).join("\n")}\nShipping: ${o.shippingPence ? formatPrice(o.shippingPence) : "Free"}\n${o.giftCardPence ? `Gift card: -${formatPrice(o.giftCardPence)}\n` : ""}Total: ${formatPrice(o.totalPence)}\n`;
  return { subject: `Your Sparkthunder order ${o.number}`, html, text };
}

export function shippedEmail(o: { number: string; name: string; carrier: string; tracking: string }) {
  const html = shell("Your order is on its way", `<p style="margin:0 0 12px">Order <b>${esc(o.number)}</b> has shipped${o.carrier ? ` with ${esc(o.carrier)}` : ""}.</p>${o.tracking ? `<p style="margin:0">Tracking number: <b>${esc(o.tracking)}</b></p>` : ""}`);
  return { subject: `Your Sparkthunder order ${o.number} has shipped`, html, text: `Order ${o.number} has shipped${o.carrier ? ` with ${o.carrier}` : ""}.${o.tracking ? ` Tracking: ${o.tracking}` : ""}\n` };
}
