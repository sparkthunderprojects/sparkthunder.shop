export const GIFT_AMOUNTS = [1000, 2500, 5000, 10000] as const;
export const GIFT_MIN = 500;
export const GIFT_MAX = 25000;
export const GIFT_MESSAGE_MAX = 200;

export const clampGift = (pence: number) => Math.min(GIFT_MAX, Math.max(GIFT_MIN, Math.round(pence)));
