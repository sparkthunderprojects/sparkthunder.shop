/** "Ways to pay" pages: PayPal, Klarna and Clearpay. A page only shows once the owner has switched it on in Admin > Shipping and payments
 *  (after enabling that method in their Stripe dashboard), so the site never advertises a way to pay that checkout does not offer. */
export const PAY_METHODS = ["paypal", "klarna", "clearpay"] as const;
export type PayMethodId = (typeof PAY_METHODS)[number];
export type PayLaterSettings = Record<PayMethodId, boolean>;
export const DEFAULT_PAY_LATER: PayLaterSettings = { paypal: false, klarna: false, clearpay: false };

export const isPayMethod = (s: string): s is PayMethodId => (PAY_METHODS as readonly string[]).includes(s);
export function normalisePayLater(raw: unknown): PayLaterSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { paypal: r.paypal === true, klarna: r.klarna === true, clearpay: r.clearpay === true };
}
export const enabledMethods = (s: PayLaterSettings): PayMethodId[] => PAY_METHODS.filter((m) => s[m]);

export type PayMethod = {
  id: PayMethodId; name: string; logo: string; logoW: number; logoH: number;
  /** Banner background tint and button colours, taken from the provider's own look. */
  tint: string; button: string; buttonText: string;
  headline: string; sub: string; cta: string; hubLine: string;
  /** Number of instalments in the example, when to pay each, and whether the schedule is a fixed promise. */
  parts: number; schedule: string[]; scheduleNote: string;
  steps: [string, string][];
  facts: [string, string][];
  faq: [string, string][];
};

const COMMON_FAQ: [string, string][] = [
  ["What if I return something?", "Return it as normal using our delivery and returns page. When we refund an order paid this way, the provider adjusts what you still owe or sends back what you have already paid."],
  ["Does it cost extra?", "There is no fee from us for choosing it. Paying on time keeps it interest-free. Missed payments can bring late fees, so check the terms the provider shows you before you confirm."],
];

export const PAY_INFO: Record<PayMethodId, PayMethod> = {
  paypal: {
    id: "paypal", name: "PayPal", logo: "/pay/paypal.png", logoW: 168, logoH: 194, tint: "#dfeaf8", button: "#003087", buttonText: "#ffffff",
    headline: "Check out your way with PayPal.", sub: "Choose PayPal at checkout and pay with your PayPal balance, a saved card or bank, or a pay later option if PayPal offers one to you.", cta: "How PayPal works", hubLine: "Pay with your PayPal account, with pay later options where PayPal offers them.",
    parts: 3, schedule: ["Payment 1 (at checkout)", "Payment 2", "Payment 3"], scheduleNote: "If PayPal offers you Pay in 3, it splits the total into three equal payments. PayPal shows your exact dates before you confirm.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose PayPal", "On the payment page, pick PayPal and log in to your account."], ["Pick how to pay", "Choose your balance, a saved card or bank, or a pay later option if one is shown. You see the full terms first."], ["Confirm", "Approve the payment. We get your order straight away and start packing."]],
    facts: [["Who can use it", "Anyone with a PayPal account. Pay later options depend on PayPal approving you."], ["Where", "UK orders in pounds."], ["Protection", "PayPal Purchase Protection may apply, see PayPal's terms."], ["Your details", "We never see your PayPal login or full payment details."]],
    faq: [["Do I need a PayPal account?", "Yes, you log in to PayPal to pay. You can create one during checkout."], ["Is pay later always available?", "No. PayPal decides whether to offer it, based on the order and your circumstances, and shows you the terms before you agree."], ...COMMON_FAQ],
  },
  klarna: {
    id: "klarna", name: "Klarna", logo: "/pay/klarna.png", logoW: 228, logoH: 196, tint: "#ffd9e4", button: "#ffb3c7", buttonText: "#0b0b0c",
    headline: "Get what you love today. Pay later with Klarna.", sub: "Choose Klarna at checkout. Depending on your order, you can pay in full, pay in 30 days, or split it into 3 interest-free payments.", cta: "How Klarna works", hubLine: "Pay in 30 days or split into 3 payments.",
    parts: 3, schedule: ["Today", "In 30 days", "In 60 days"], scheduleNote: "Klarna Pay in 3 splits the total into three payments. Klarna shows your exact schedule before you confirm.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose Klarna", "Pick Klarna on the payment page. You will be taken to Klarna to continue."], ["Choose your option", "Pay in full, pay in 30 days, or Pay in 3, whichever Klarna offers for your order. Read the terms shown."], ["Confirm", "Approve, and you come back to us. Klarna collects your payments, we pack your order."]],
    facts: [["Pay in 30 days", "One payment 30 days after your order, for orders from £1 up to £1,500."], ["Pay in 3", "Three interest-free payments, for orders from £1 up to £2,000."], ["Longer finance", "On larger orders (£250 to £5,000) Klarna may offer longer financing, which can include interest. Its terms are shown before you agree."], ["Who can use it", "18+ and UK residents. Klarna decides what to offer, subject to status."]],
    faq: [["Is it interest-free?", "Pay in 30 days and Pay in 3 are interest-free when paid on time. Longer financing can include interest, and Klarna shows the cost before you agree."], ["Why can't I see every option?", "Klarna chooses which options to show based on your order and circumstances."], ...COMMON_FAQ],
  },
  clearpay: {
    id: "clearpay", name: "Clearpay", logo: "/pay/clearpay.png", logoW: 210, logoH: 212, tint: "#c9f3e3", button: "#b2fce4", buttonText: "#0b0b0c",
    headline: "Buy now, pay later. Split into 4 payments.", sub: "Choose Clearpay at checkout and pay in 4 interest-free instalments, automatically every two weeks.", cta: "How Clearpay works", hubLine: "Pay in 4 instalments, every two weeks.",
    parts: 4, schedule: ["Today", "In 2 weeks", "In 4 weeks", "In 6 weeks"], scheduleNote: "Clearpay takes the first payment at checkout and the rest automatically every two weeks.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose Clearpay", "Pick Clearpay on the payment page and log in or sign up."], ["Pay the first quarter", "Clearpay takes the first of 4 payments with your card, and checks eligibility."], ["Pay the rest", "The other 3 payments come out automatically every two weeks. You pay no interest if you pay on time."]],
    facts: [["How it splits", "4 equal payments, the first at checkout, then every 2 weeks."], ["Order limits", "Clearpay sets minimum and maximum order values, shown at checkout."], ["Who can use it", "18+ and UK residents, subject to status. You pay with a debit or credit card."], ["Late fees", "Missed payments can bring late fees, so keep your card topped up."]],
    faq: [["Is it a loan?", "Clearpay is a form of credit. It is interest-free when you pay on time, and it is subject to a check before you are approved."], ["Can I pay early?", "Yes, you can pay instalments early through your Clearpay account."], ...COMMON_FAQ],
  },
};

/** Split a total into equal instalments, in pence. Any odd pennies go on the first payment, as providers do. */
export function splitInstalments(totalPence: number, parts: number): number[] {
  const total = Math.max(0, Math.round(totalPence)), n = Math.max(1, Math.floor(parts));
  const base = Math.floor(total / n), rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? rest : 0));
}

/** The small print shown on every pay later page. */
export const PAY_LATER_SMALL_PRINT = "Subject to status. 18+ and UK residents only. Pay later is a form of credit: it is interest-free when paid on time, and late fees may apply. Terms apply. Borrow responsibly.";
