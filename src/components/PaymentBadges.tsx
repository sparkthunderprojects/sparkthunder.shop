import Image from "next/image";
import { PAYMENT_METHODS } from "@/lib/site";
import type { PayMethodId } from "@/lib/pay-later";

const badge = "h-8 w-[3.25rem] rounded-[3px]";
const text = { fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 700 } as const;

/** Simple neutral payment badges (the name in type). PayPal, Klarna and Clearpay use the artwork the owner supplied. */
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

const Art = ({ src, alt, w, h, bg }: { src: string; alt: string; w: number; h: number; bg: string }) => (
  <span className={`${badge} grid place-items-center`} style={{ background: bg }}><Image src={src} alt="" width={w} height={h} unoptimized className="h-5 w-auto max-w-[2.4rem] object-contain" /><span className="sr-only">{alt}</span></span>
);
const Word = ({ label, fg, bg, size = 8.5 }: { label: string; fg: string; bg: string; size?: number }) => (
  <svg viewBox="0 0 52 32" className={badge} aria-hidden="true"><rect width="52" height="32" fill={bg} /><text x="26" y="19.5" textAnchor="middle" fontSize={size} fill={fg} style={text}>{label}</text></svg>
);

/** Each payment option, in the order shown. "card" stands for the three card brands. */
const ORDER: { id: PayMethodId; names: string[] }[] = [
  { id: "card", names: ["Visa", "Mastercard", "American Express"] },
  { id: "applepay", names: ["Apple Pay"] }, { id: "googlepay", names: ["Google Pay"] },
  { id: "paypal", names: ["PayPal"] }, { id: "klarna", names: ["Klarna"] }, { id: "clearpay", names: ["Clearpay"] },
  { id: "amazonpay", names: ["Amazon Pay"] }, { id: "revolutpay", names: ["Revolut Pay"] },
];

function mark(name: string): React.ReactNode {
  if (name in MARKS) return MARKS[name as keyof typeof MARKS];
  if (name === "PayPal") return <Art src="/pay/paypal.png" alt="PayPal" w={168} h={194} bg="#fff" />;
  if (name === "Klarna") return <Art src="/pay/klarna.png" alt="Klarna" w={228} h={196} bg="#ffb3c7" />;
  if (name === "Clearpay") return <Art src="/pay/clearpay.png" alt="Clearpay" w={210} h={212} bg="#b2fce4" />;
  if (name === "Amazon Pay") return <Word label="Amazon Pay" fg="#111" bg="#ff9900" size={8} />;
  if (name === "Revolut Pay") return <Word label="Revolut Pay" fg="#fff" bg="#191c1f" size={8} />;
  return null;
}

/** Pass `methods` (the payment options this store has switched on) to show those; with none given it shows the five basics. */
export function PaymentBadges({ className = "mt-6", methods, centered = false }: { className?: string; methods?: PayMethodId[]; centered?: boolean }) {
  const names = methods ? ORDER.filter((o) => methods.includes(o.id)).flatMap((o) => o.names) : [...PAYMENT_METHODS];
  return (
    <div className={className}>
      <p className="sr-only">Accepted payment methods: {names.join(", ")}</p>
      <ul className={`flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`} aria-hidden="true" data-paybadges>
        {names.map((m) => <li key={m} title={m} data-paybadge={m}>{mark(m)}</li>)}
      </ul>
    </div>
  );
}
