import { PAYMENT_METHODS } from "@/lib/site";

const badge = "h-8 w-[3.25rem] rounded-[3px]";
const text = { fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 700 } as const;

/** Simple neutral payment badges. Swap in official brand artwork if you prefer. */
const MARKS: Record<(typeof PAYMENT_METHODS)[number], React.ReactNode> = {
  Visa: (
    <svg viewBox="0 0 52 32" className={badge} aria-hidden="true"><rect width="52" height="32" fill="#fff" /><text x="26" y="21.5" textAnchor="middle" fontSize="15" fontStyle="italic" fill="#1a1f71" style={{ ...text, fontWeight: 800 }}>VISA</text></svg>
  ),
  Mastercard: (
    <svg viewBox="0 0 52 32" className={badge} aria-hidden="true"><rect width="52" height="32" fill="#fff" /><circle cx="21" cy="16" r="9" fill="#eb001b" /><circle cx="31" cy="16" r="9" fill="#f79e1b" /><path d="M26 8.9a9 9 0 0 1 0 14.2 9 9 0 0 1 0-14.2z" fill="#ff5f00" /></svg>
  ),
  "American Express": (
    <svg viewBox="0 0 52 32" className={badge} aria-hidden="true"><rect width="52" height="32" fill="#2e77bc" /><text x="26" y="20.5" textAnchor="middle" fontSize="11" fill="#fff" style={{ ...text, letterSpacing: "0.5px" }}>AMEX</text></svg>
  ),
  "Apple Pay": (
    <svg viewBox="0 0 52 32" className={badge} aria-hidden="true"><rect width="52" height="32" fill="#fff" /><text x="26" y="20.5" textAnchor="middle" fontSize="10" fill="#000" style={text}>Apple Pay</text></svg>
  ),
  "Google Pay": (
    <svg viewBox="0 0 52 32" className={badge} aria-hidden="true"><rect width="52" height="32" fill="#fff" /><text x="26" y="20.5" textAnchor="middle" fontSize="11.5" fill="#3c4043" style={text}><tspan fill="#4285f4">G</tspan> Pay</text></svg>
  ),
};

export function PaymentBadges() {
  return (
    <div className="mt-6">
      <p className="sr-only">Accepted payment methods: {PAYMENT_METHODS.join(", ")}</p>
      <ul className="flex flex-wrap gap-2" aria-hidden="true">
        {PAYMENT_METHODS.map((m) => <li key={m} title={m}>{MARKS[m]}</li>)}
      </ul>
    </div>
  );
}
