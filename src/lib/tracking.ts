const CARRIERS: [RegExp, (n: string) => string][] = [
  [/royal\s*mail/i, (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(n)}`],
  [/evri|hermes/i, (n) => `https://www.evri.com/track/parcel/${encodeURIComponent(n)}`],
  [/dpd/i, (n) => `https://track.dpd.co.uk/parcels/${encodeURIComponent(n)}`],
  [/dhl/i, (n) => `https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(n)}`],
  [/ups/i, (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`],
  [/fedex/i, (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`],
  [/parcelforce/i, (n) => `https://www.parcelforce.com/track-trace?trackNumber=${encodeURIComponent(n)}`],
  [/usps/i, (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`],
];

/** A tracking link for the carriers we know, otherwise null (the number is still shown). */
export function trackingUrl(carrier?: string | null, number?: string | null): string | null {
  const n = (number ?? "").trim();
  if (!n) return null;
  const hit = CARRIERS.find(([re]) => re.test(carrier ?? ""));
  return hit ? hit[1](n) : null;
}
