/** "Payment options" pages: PayPal, Klarna and Clearpay. A page only shows once the owner has switched it on in Admin > Shipping and payments
 *  (after enabling that method in their Stripe dashboard), so the site never advertises a way to pay that checkout does not offer. */
export const PAY_METHODS = ["applepay", "googlepay", "card", "giftcard", "amazonpay", "revolutpay", "paypal", "klarna", "clearpay"] as const;
export type PayMethodId = (typeof PAY_METHODS)[number];
export type PayLaterSettings = Record<PayMethodId, boolean>;
/** Cards, gift cards and the two wallets the shop already takes through Stripe start on; the rest wait until the owner enables them in Stripe and ticks them in the admin. */
export const DEFAULT_PAY_LATER: PayLaterSettings = { applepay: true, googlepay: true, card: true, giftcard: true, amazonpay: false, revolutpay: false, paypal: false, klarna: false, clearpay: false };

/** The original Sparkthunder store also takes PayPal, Klarna and Clearpay (the owner said so), so they start on there until its payment options are saved in the admin. New stores keep the safer defaults. */
export const ORIGINAL_STORE_PAY_LATER: PayLaterSettings = { ...DEFAULT_PAY_LATER, paypal: true, klarna: true, clearpay: true };

export const isPayMethod = (s: string): s is PayMethodId => (PAY_METHODS as readonly string[]).includes(s);
export function normalisePayLater(raw: unknown): PayLaterSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(PAY_METHODS.map((m) => [m, typeof r[m] === "boolean" ? r[m] : DEFAULT_PAY_LATER[m]])) as PayLaterSettings;
}
export const enabledMethods = (s: PayLaterSettings): PayMethodId[] => PAY_METHODS.filter((m) => s[m]);

export type ChipIcon = "pct" | "box" | "calendar" | "lock" | "bolt" | "gift";
export type PayGroup = "wallet" | "later" | "store";
export const GROUP_TITLE: Record<PayGroup, string> = { wallet: "Cards and wallets", store: "Your Sparkthunder balance", later: "Pay later" };

export type PayMethod = {
  id: PayMethodId; name: string; group: PayGroup;
  /** Provider artwork, when we hold it. Without it the page uses the name in type. */
  logo?: string; logoW?: number; logoH?: number;
  /** Banner background tint and button colours. */
  tint: string; button: string; buttonText: string;
  headline: string; sub: string; cta: string; hubLine: string;
  chips: [ChipIcon, string][];
  /** Instalments for the calculator. 0 = no calculator (not a pay later method). */
  parts: number; schedule: string[]; scheduleNote: string;
  /** Pay later methods are credit, so their pages carry the credit small print. */
  credit: boolean;
  steps: [string, string][];
  facts: [string, string][];
  faq: [string, string][];
};

const COMMON_FAQ: [string, string][] = [
  ["What if I return something?", "Return it as normal using our delivery and returns page. When we refund an order paid this way, the provider adjusts what you still owe or sends back what you have already paid."],
  ["Does it cost extra?", "There is no fee from us for choosing it. Paying on time keeps it interest-free. Missed payments can bring late fees, so check the terms the provider shows you before you confirm."],
];

const BNPL: Record<"paypal" | "klarna" | "clearpay", PayMethod> = {
  paypal: {
    id: "paypal", name: "PayPal", group: "wallet", credit: true, chips: [["lock", "Pay without sharing card details"], ["box", "Ships just like any order"], ["calendar", "Pay later where offered"]], logo: "/pay/paypal.png", logoW: 168, logoH: 194, tint: "#dfeaf8", button: "#003087", buttonText: "#ffffff",
    headline: "Check out your way with PayPal.", sub: "Choose PayPal at checkout and pay with your PayPal balance, a saved card or bank, or a pay later option if PayPal offers one to you.", cta: "How PayPal works", hubLine: "Pay with your PayPal account, with pay later options where PayPal offers them.",
    parts: 3, schedule: ["Payment 1 (at checkout)", "Payment 2", "Payment 3"], scheduleNote: "If PayPal offers you Pay in 3, it splits the total into three equal payments. PayPal shows your exact dates before you confirm.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose PayPal", "On the payment page, pick PayPal and log in to your account."], ["Pick how to pay", "Choose your balance, a saved card or bank, or a pay later option if one is shown. You see the full terms first."], ["Confirm", "Approve the payment. We get your order straight away and start packing."]],
    facts: [["Who can use it", "Anyone with a PayPal account. Pay later options depend on PayPal approving you."], ["Where", "UK orders in pounds."], ["Protection", "PayPal Purchase Protection may apply, see PayPal's terms."], ["Your details", "We never see your PayPal login or full payment details."]],
    faq: [["Do I need a PayPal account?", "Yes, you log in to PayPal to pay. You can create one during checkout."], ["Is pay later always available?", "No. PayPal decides whether to offer it, based on the order and your circumstances, and shows you the terms before you agree."], ...COMMON_FAQ],
  },
  klarna: {
    id: "klarna", name: "Klarna", group: "later", credit: true, chips: [["pct", "Interest-free if paid on time"], ["box", "Ships just like any order"], ["calendar", "Flexible payments"]], logo: "/pay/klarna.png", logoW: 228, logoH: 196, tint: "#ffd9e4", button: "#ffb3c7", buttonText: "#0b0b0c",
    headline: "Get what you love today. Pay later with Klarna.", sub: "Choose Klarna at checkout. Depending on your order, you can pay in full, pay in 30 days, or split it into 3 interest-free payments.", cta: "How Klarna works", hubLine: "Pay in 30 days or split into 3 payments.",
    parts: 3, schedule: ["Today", "In 30 days", "In 60 days"], scheduleNote: "Klarna Pay in 3 splits the total into three payments. Klarna shows your exact schedule before you confirm.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose Klarna", "Pick Klarna on the payment page. You will be taken to Klarna to continue."], ["Choose your option", "Pay in full, pay in 30 days, or Pay in 3, whichever Klarna offers for your order. Read the terms shown."], ["Confirm", "Approve, and you come back to us. Klarna collects your payments, we pack your order."]],
    facts: [["Pay in 30 days", "One payment 30 days after your order, for orders from £1 up to £1,500."], ["Pay in 3", "Three interest-free payments, for orders from £1 up to £2,000."], ["Longer finance", "On larger orders (£250 to £5,000) Klarna may offer longer financing, which can include interest. Its terms are shown before you agree."], ["Who can use it", "18+ and UK residents. Klarna decides what to offer, subject to status."]],
    faq: [["Is it interest-free?", "Pay in 30 days and Pay in 3 are interest-free when paid on time. Longer financing can include interest, and Klarna shows the cost before you agree."], ["Why can't I see every option?", "Klarna chooses which options to show based on your order and circumstances."], ...COMMON_FAQ],
  },
  clearpay: {
    id: "clearpay", name: "Clearpay", group: "later", credit: true, chips: [["pct", "Interest-free if paid on time"], ["box", "Ships just like any order"], ["calendar", "Flexible payments"]], logo: "/pay/clearpay.png", logoW: 210, logoH: 212, tint: "#c9f3e3", button: "#b2fce4", buttonText: "#0b0b0c",
    headline: "Buy now, pay later. Split into 4 payments.", sub: "Choose Clearpay at checkout and pay in 4 interest-free instalments, automatically every two weeks.", cta: "How Clearpay works", hubLine: "Pay in 4 instalments, every two weeks.",
    parts: 4, schedule: ["Today", "In 2 weeks", "In 4 weeks", "In 6 weeks"], scheduleNote: "Clearpay takes the first payment at checkout and the rest automatically every two weeks.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose Clearpay", "Pick Clearpay on the payment page and log in or sign up."], ["Pay the first quarter", "Clearpay takes the first of 4 payments with your card, and checks eligibility."], ["Pay the rest", "The other 3 payments come out automatically every two weeks. You pay no interest if you pay on time."]],
    facts: [["How it splits", "4 equal payments, the first at checkout, then every 2 weeks."], ["Order limits", "Clearpay sets minimum and maximum order values, shown at checkout."], ["Who can use it", "18+ and UK residents, subject to status. You pay with a debit or credit card."], ["Late fees", "Missed payments can bring late fees, so keep your card topped up."]],
    faq: [["Is it a loan?", "Clearpay is a form of credit. It is interest-free when you pay on time, and it is subject to a check before you are approved."], ["Can I pay early?", "Yes, you can pay instalments early through your Clearpay account."], ...COMMON_FAQ],
  },
};

const WALLET_FAQ_RETURNS: [string, string] = ["What if I return something?", "Return it as normal using our delivery and returns page. We refund to the way you paid."];
const NONE = { parts: 0, schedule: [] as string[], scheduleNote: "", credit: false };

const EXTRA: Record<"applepay" | "googlepay" | "card" | "giftcard" | "amazonpay" | "revolutpay", PayMethod> = {
  applepay: {
    id: "applepay", name: "Apple Pay", group: "wallet", ...NONE, tint: "#e6e6ea", button: "#000000", buttonText: "#ffffff",
    chips: [["lock", "Face ID or Touch ID"], ["bolt", "Check out in seconds"], ["box", "Ships just like any order"]],
    headline: "Check out in a touch with Apple Pay.", sub: "Choose Apple Pay at checkout, confirm with Face ID, Touch ID or your passcode, and your order is placed. No typing in card numbers or addresses.", cta: "How Apple Pay works", hubLine: "Pay with a touch using a card in your Apple Wallet.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose Apple Pay", "Pick the Apple Pay button on the payment page."], ["Confirm", "Check your details and approve with Face ID, Touch ID or your passcode."], ["Done", "We get your order straight away and start packing."]],
    facts: [["What you need", "An Apple device with a card in Wallet. It usually shows in Safari on iPhone, iPad and Mac."], ["Your card stays private", "Apple Pay uses a device-specific number, so we never see your real card number."], ["Currency", "Orders are charged in pounds."], ["Cost", "No extra charge from us for using Apple Pay."]],
    faq: [["Why don't I see Apple Pay?", "It shows only on supported devices and browsers where you have a card in Wallet. Try Safari on your iPhone, iPad or Mac, and check a card is added in Wallet."], ["Can I send it to a different address?", "Yes. Choose or enter the delivery address on the payment page before you confirm."], WALLET_FAQ_RETURNS],
  },
  googlepay: {
    id: "googlepay", name: "Google Pay", group: "wallet", ...NONE, tint: "#e3ecfc", button: "#1a73e8", buttonText: "#ffffff",
    chips: [["lock", "Your card number stays private"], ["bolt", "Check out in seconds"], ["box", "Ships just like any order"]],
    headline: "Pay fast with Google Pay.", sub: "Choose Google Pay at checkout and use a card you have already saved to your Google account. Approve it and you are done.", cta: "How Google Pay works", hubLine: "Pay with a card saved to your Google account.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose Google Pay", "Pick the Google Pay button on the payment page."], ["Pick your card", "Choose a card saved to your Google account and confirm on your device."], ["Done", "We get your order straight away and start packing."]],
    facts: [["What you need", "A card saved to your Google account. It shows in Chrome and on Android phones."], ["Your card stays private", "Google Pay passes a secure token, so we never see your full card number."], ["Currency", "Orders are charged in pounds."], ["Cost", "No extra charge from us for using Google Pay."]],
    faq: [["Why don't I see Google Pay?", "It shows only in supported browsers with a card saved to your Google account. Try Chrome while signed in, and check you have a card saved."], ["Is it safe?", "Google Pay shares a token instead of your card number, and the payment is handled by Stripe."], WALLET_FAQ_RETURNS],
  },
  card: {
    id: "card", name: "Card", group: "wallet", ...NONE, tint: "#e8e6f3", button: "#1a1f71", buttonText: "#ffffff",
    chips: [["lock", "Handled securely by Stripe"], ["bolt", "No account needed"], ["box", "Ships just like any order"]],
    headline: "Pay by card, no account needed.", sub: "We take Visa, Mastercard and American Express debit and credit cards. Enter your details on Stripe's secure payment page and you are done.", cta: "How card payment works", hubLine: "Visa, Mastercard and American Express.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Enter your card", "On Stripe's secure payment page, enter your card details and delivery address."], ["Approve", "Your bank may ask you to confirm in its app or with a code. That is normal."], ["Done", "We get your order straight away and start packing."]],
    facts: [["Cards we take", "Visa, Mastercard and American Express, debit or credit."], ["Your details", "Card details go straight to Stripe. They never touch our servers."], ["Currency", "Orders are charged in pounds."], ["Guest checkout", "You do not need an account to order."]],
    faq: [["Is it safe to pay by card here?", "Yes. The payment page is run by Stripe, a payments company, and your card number is never stored by us."], ["My card was declined", "Check the details, try another card, or contact your bank. A wallet such as Apple Pay or Google Pay may also work."], WALLET_FAQ_RETURNS],
  },
  giftcard: {
    id: "giftcard", name: "Gift card", group: "store", ...NONE, tint: "#fff1b8", button: "#ffd400", buttonText: "#0b0b0c",
    chips: [["gift", "Spend it on anything in the shop"], ["pct", "Balance never runs out unspent"], ["box", "Part-spent cards keep their balance"]],
    headline: "Pay with a Sparkthunder gift card.", sub: "Got a gift card code? Enter it at checkout and the balance comes off your order. Anything left stays on the card for next time.", cta: "How gift cards work", hubLine: "Enter your gift card code at checkout.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual."], ["Enter your code", "In your basket, enter your gift card code and apply it."], ["See your total drop", "The card's balance is taken off your order straight away."], ["Pay any rest", "If the card does not cover everything, pay the difference by card or wallet. If it does, you pay nothing more."]],
    facts: [["Where it works", "Everything in the shop, across every universe."], ["Part-spent cards", "Any balance left stays on the card. Check it any time on the balance page."], ["One per order", "At the moment you can use one gift card on each order."], ["Not a cash refund", "Gift cards cannot be exchanged for cash once issued."]],
    faq: [["How do I check my balance?", "Use the check your balance page, and enter your code."], ["Can I buy one for someone?", "Yes. Choose an amount and a design, and we email the card straight to them."], ["What if my order is more than the card?", "You pay the rest by card or wallet in the same checkout."]],
  },
  amazonpay: {
    id: "amazonpay", name: "Amazon Pay", group: "wallet", ...NONE, tint: "#ffe9b8", button: "#ffd814", buttonText: "#0f1111",
    chips: [["lock", "Use your Amazon account"], ["bolt", "No card typing"], ["box", "Ships just like any order"]],
    headline: "Check out with your Amazon account.", sub: "Choose Amazon Pay at checkout, sign in to Amazon, and pay with the cards and address already saved there.", cta: "How Amazon Pay works", hubLine: "Pay with the details saved in your Amazon account.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose Amazon Pay", "Pick Amazon Pay on the payment page and sign in to your Amazon account."], ["Pick how to pay", "Choose the card and delivery address saved in your Amazon account."], ["Confirm", "Approve the payment. We get your order and start packing."]],
    facts: [["What you need", "An Amazon account with a saved payment method."], ["What we receive", "Your name, delivery address and email, so we can send your order. We never see your Amazon password."], ["Currency", "Orders are charged in pounds."], ["Order is with us", "You are buying from Sparkthunder. Amazon is only the way you pay."]],
    faq: [["Is my order from Amazon?", "No. You are buying from us, and we deliver it. Amazon only handles the payment sign-in."], ["Can I change the delivery address?", "Yes, choose another address on the payment page before you confirm."], WALLET_FAQ_RETURNS],
  },
  revolutpay: {
    id: "revolutpay", name: "Revolut Pay", group: "wallet", ...NONE, tint: "#dde6ff", button: "#0666eb", buttonText: "#ffffff",
    chips: [["lock", "Approve in the Revolut app"], ["bolt", "Fast checkout"], ["box", "Ships just like any order"]],
    headline: "Pay in a tap with Revolut Pay.", sub: "Choose Revolut Pay at checkout and approve the payment in your Revolut app, from your balance or a card saved there.", cta: "How Revolut Pay works", hubLine: "Approve the payment in your Revolut app.",
    steps: [["Fill your basket", "Add your Sparkthunder merchandise as usual and go to checkout."], ["Choose Revolut Pay", "Pick Revolut Pay on the payment page."], ["Approve in the app", "Open your Revolut app and approve the payment from your balance or a saved card."], ["Done", "We get your order straight away and start packing."]],
    facts: [["What you need", "A Revolut account and the Revolut app on your phone."], ["Your details", "We never see your Revolut login or full payment details."], ["Currency", "Orders are charged in pounds."], ["Cost", "No extra charge from us for using Revolut Pay."]],
    faq: [["Do I need the app?", "Yes, you approve the payment in your Revolut app."], ["What if I do not see it?", "Revolut Pay appears only where it is available for your account and order. You can pay by card or another wallet instead."], WALLET_FAQ_RETURNS],
  },
};


export const PAY_INFO: Record<PayMethodId, PayMethod> = { ...BNPL, ...EXTRA };

/** Split a total into equal instalments, in pence. Any odd pennies go on the first payment, as providers do. */
export function splitInstalments(totalPence: number, parts: number): number[] {
  const total = Math.max(0, Math.round(totalPence)), n = Math.max(1, Math.floor(parts));
  const base = Math.floor(total / n), rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? rest : 0));
}

/** The small print shown on every pay later page. */
export const PAY_LATER_SMALL_PRINT = "Subject to status. 18+ and UK residents only. Pay later is a form of credit: it is interest-free when paid on time, and late fees may apply. Terms apply. Borrow responsibly.";
