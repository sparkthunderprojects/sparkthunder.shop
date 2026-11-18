/** Elixir Points: the cross-brand rewards programme. This file only works out a preview; nothing is saved. */
export type ElixirRate = { earnPerGbp: number; redeemPerGbp: number };

/** Used when the programme cannot be reached, so the basket still shows a sensible preview. */
export const ELIXIR_FALLBACK: ElixirRate = { earnPerGbp: 1, redeemPerGbp: 200 };

/**
 * Points an order would earn: whole pounds spent on products after any discount.
 * Gift cards and delivery earn nothing, and paying with a gift card does not reduce what you earn.
 */
export function elixirPointsFor(eligiblePence: number, rate: ElixirRate): number {
  return Math.max(0, Math.floor(eligiblePence / 100)) * rate.earnPerGbp;
}

/** What a number of points is worth, in pence. */
export function elixirPointsValuePence(points: number, rate: ElixirRate): number {
  return rate.redeemPerGbp > 0 ? Math.floor((points / rate.redeemPerGbp) * 100) : 0;
}
