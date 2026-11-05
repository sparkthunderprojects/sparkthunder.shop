/** Shared (client-safe) helpers for gift card codes. */
export const formatCode = (code: string) => `SPK-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;

/** Accepts "spk-abcd efgh-jklm", "ABCDEFGHJKLM" etc. Returns the 12-character code or null. */
export function normaliseCode(input: string): string | null {
  let c = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length === 15 && c.startsWith("SPK")) c = c.slice(3);
  return /^[A-Z0-9]{12}$/.test(c) ? c : null;
}

export type CardStatus = "active" | "used" | "expired" | "disabled";
export const isGiftCardLine = (slug: string) => slug.startsWith("gift-card-");

export const effectiveStatus = (c: { status: string; balance_pence: number; expires_at: string | null }): CardStatus =>
  c.status !== "active" ? "disabled" : c.expires_at && new Date(c.expires_at) < new Date() ? "expired" : c.balance_pence === 0 ? "used" : "active";
