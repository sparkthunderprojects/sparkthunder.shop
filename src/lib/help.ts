import { formatPrice } from "@/lib/site";

/**
 * Help Center content. Written as data so every store gets the same answers filled in with its own name, support address,
 * delivery costs and payment options. Text may contain links as [label](/path); nothing else is interpreted (no HTML).
 */

export type HelpCtx = {
  name: string;
  email: string | null;
  /** One line per delivery zone, already worded, e.g. "United Kingdom (United Kingdom): ..." */
  deliveryLines: string[];
  freeOverPence: number;
  giftWrapPence: number;
  countries: string[];
  /** Payment options pages that are switched on for this store. */
  payPages: { id: string; name: string }[];
};

export type HelpBlock = { p: string } | { h: string } | { ul: string[] } | { ol: string[] };
export type HelpCategory = { slug: string; title: string; blurb: string; icon: string };
export type HelpArticle = { slug: string; category: string; title: string; summary: string; keywords: string; popular?: boolean; blocks: HelpBlock[]; related: string[] };

/** Simple line icons (24x24 paths). */
const ICON = {
  returns: "M4 8h13a3 3 0 010 6H8M4 8l3-3M4 8l3 3M20 18H7",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
  truck: "M2 6h11v10H2zM13 9h4l4 4v3h-8zM6 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  gift: "M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-3 0-4-4-1.5-4S12 9 12 9zM12 9c3 0 4-4 1.5-4S12 9 12 9z",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5M12 17h.01",
  person: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  access: "M12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM5 8h14M12 8v6M9 21l3-7 3 7",
} as const;
export const helpIcon = (name: string) => ICON[name as keyof typeof ICON] ?? ICON.help;

export const HELP_CATEGORIES: HelpCategory[] = [
  { slug: "orders", title: "Orders and tracking", blurb: "Where is my order, changing or cancelling it", icon: "box" },
  { slug: "shipping", title: "Shipping and delivery", blurb: "Options, costs and timeframes", icon: "truck" },
  { slug: "returns", title: "Returns and refunds", blurb: "View the policy and start a return", icon: "returns" },
  { slug: "payments", title: "Payments", blurb: "Ways to pay and how it is kept safe", icon: "card" },
  { slug: "gift-cards", title: "Gift cards", blurb: "Buying, sending, spending and balances", icon: "gift" },
  { slug: "products", title: "Product questions", blurb: "Sizes, printing and care", icon: "help" },
  { slug: "account", title: "Your account", blurb: "Signing in, wishlist and your details", icon: "person" },
  { slug: "things-to-know", title: "Things to know", blurb: "Accessibility, privacy and the small print", icon: "access" },
];

export const HELP_TOPICS = ["Where is my order", "Return or exchange", "Replacement for a faulty or wrong item", "Payment or refund", "Gift card", "Product question", "Something else"] as const;
export const topicFromParam = (v: string | undefined) => (v === "replacement" ? HELP_TOPICS[2] : v === "return" ? HELP_TOPICS[1] : v === "order" ? HELP_TOPICS[0] : (HELP_TOPICS as readonly string[]).includes(v ?? "") ? (v as string) : HELP_TOPICS[0]);

export const categoryBySlug = (slug: string) => HELP_CATEGORIES.find((c) => c.slug === slug);

const p = (s: string): HelpBlock => ({ p: s });
const h = (s: string): HelpBlock => ({ h: s });
const ul = (...s: string[]): HelpBlock => ({ ul: s });
const ol = (...s: string[]): HelpBlock => ({ ol: s });

const money = (pence: number) => formatPrice(pence);

/** Every article, with this store's facts filled in. */
export function helpArticles(c: HelpCtx, t: (k: string, v?: Record<string, string | number>) => string = (k, v) => (v ? k.replace(/\{(\w+)\}/g, (m, n) => String(v[n] ?? m)) : k)): HelpArticle[] {
  const mail = (x: HelpCtx) => (x.email ? `[${x.email}](mailto:${x.email})` : `[${t("our contact page")}](/help/contact)`);
  const delivery = c.deliveryLines.length ? ul(...c.deliveryLines) : p(t("Delivery costs are shown in your basket and at checkout before you pay."));
  const free = c.freeOverPence ? t("Orders of {money} or more qualify for free delivery.", { money: money(c.freeOverPence) }) : "";
  const pay = c.payPages.length ? t("We also offer {list}.", { list: c.payPages.map((m) => `[${m.name}](/payment-options/${m.id})`).join(", ") }) : "";
  return [
    // ---------------------------------------------------------------- orders
    {
      slug: "where-is-my-order", category: "orders", title: t("Where is my order?"), popular: true,
      summary: t("How to follow your order from payment to your door."),
      keywords: "track tracking status parcel shipped dispatched delivery late missing",
      blocks: [
        p(t("Once you have paid, we email you an order confirmation. When your order ships we email you again, with tracking details where the carrier provides them.")),
        p(t("Many {name} products are printed to order, so they are made after you buy. Allow a few working days for printing, then the delivery time. Items in one order can be made in different places and arrive in separate parcels, each with its own tracking.", { name: c.name })),
        h(t("To check on your order")),
        ol(t("[Sign in to your account](/account) with the email you used at checkout."), t("Open your order to see its progress and any tracking link."), t("No account? Use the link in your shipping email.")),
        p(t("If it has been longer than the delivery time we quoted, email us at {mail} with your order number and we will chase it.", { mail: mail(c) })),
      ],
      related: ["when-will-it-arrive", "separate-parcels", "contact-us"],
    },
    {
      slug: "separate-parcels", category: "orders", title: t("Why did my order come in separate parcels?"),
      summary: t("Different items can be made and sent from different places."),
      keywords: "split multiple boxes parcels partial missing item",
      blocks: [
        p(t("Products printed to order can be produced by different print partners, so the items in one order may ship separately and arrive on different days.")),
        p(t("You pay delivery once for the order as shown at checkout. Each parcel has its own tracking link in your shipping emails. If one parcel has not arrived after the others, check its tracking first, then contact us.")),
      ],
      related: ["where-is-my-order", "something-is-missing-or-wrong"],
    },
    {
      slug: "cancel-my-order", category: "orders", title: t("How do I cancel my order?"), popular: true,
      summary: t("What to do if you want to cancel, and what happens once printing has started."),
      keywords: "cancel cancellation change mind stop order",
      blocks: [
        p(t("Email us at {mail} as soon as you can with your order number. If printing has not started we will cancel it and refund you to the payment method you used.", { mail: mail(c) })),
        p(t("Because products are made to order, we may not be able to stop an order once it is in production. If that happens, you can still use your legal right to cancel and return the goods (see [Returns and refunds](/help/returns/returns-policy)).")),
      ],
      related: ["returns-policy", "why-was-my-order-cancelled"],
    },
    {
      slug: "why-was-my-order-cancelled", category: "orders", title: t("Why was my order cancelled?"), popular: true,
      summary: t("The usual reasons an order is cancelled, and how refunds work."),
      keywords: "cancelled canceled fraud stock payment failed refund",
      blocks: [
        p(t("An order can be cancelled if your payment could not be completed or verified, if an item cannot be produced or is no longer available, or if we could not deliver to the address given.")),
        p(t("If we cancel, any payment taken is refunded to the original payment method. The time it takes to show up depends on your bank or card provider.")),
        p(t("If you did not expect the cancellation, email {mail} with your order number and we will explain.", { mail: mail(c) })),
      ],
      related: ["cancel-my-order", "refund-time"],
    },
    {
      slug: "change-my-address", category: "orders", title: t("Can I change my delivery address or details?"),
      summary: t("How to fix a mistake in the address after you have ordered."),
      keywords: "address wrong change edit details typo postcode",
      blocks: [
        p(t("Email {mail} straight away with your order number and the correct address. If your order has not gone into production we can update it. Once it has shipped the carrier may not be able to redirect it.", { mail: mail(c) })),
        p(t("Please check your address carefully at checkout, as parcels sent to a wrong address we were given are not covered by our returns promise.")),
      ],
      related: ["where-is-my-order", "cancel-my-order"],
    },
    // -------------------------------------------------------------- shipping
    {
      slug: "when-will-it-arrive", category: "shipping", title: t("How long will delivery take?"), popular: true,
      summary: t("Production and delivery times for made-to-order products."),
      keywords: "delivery time how long days arrive estimate dispatch printing",
      blocks: [
        p(t("Most of our products are printed to order. Allow a few working days for printing before your order is posted, plus the delivery time of the service used.")),
        p(t("The delivery estimate shown in your basket is a guide, not a guarantee. We email you when your order ships. If something is out of stock or delayed we will let you know.")),
      ],
      related: ["delivery-costs", "where-is-my-order", "do-you-ship-to-my-country"],
    },
    {
      slug: "delivery-costs", category: "shipping", title: t("How much does delivery cost?"),
      summary: t("Delivery prices and when delivery is free."),
      keywords: "shipping cost price postage free delivery threshold",
      blocks: [
        delivery,
        ...(free ? [p(free)] : []),
        p(t("The exact amount is always shown in your basket and at checkout before you pay. For the full terms see [Delivery and returns](/delivery-returns).")),
      ],
      related: ["when-will-it-arrive", "do-you-ship-to-my-country"],
    },
    {
      slug: "do-you-ship-to-my-country", category: "shipping", title: t("Do you ship to my country?"), popular: true,
      summary: t("The countries we currently deliver to."),
      keywords: "international overseas country abroad worldwide europe usa customs duties",
      blocks: [
        p(c.countries.length ? t("We currently deliver to: {list}.", { list: c.countries.join(", ") }) : t("The countries we deliver to are listed at checkout.")),
        p(t("Gift cards are sent by email and can be bought from anywhere.")),
        p(t("Orders sent outside the UK may be subject to import duties, taxes or customs fees charged by the destination country. These are not included in our prices and are the recipient's responsibility.")),
      ],
      related: ["delivery-costs", "when-will-it-arrive"],
    },
    {
      slug: "gift-wrap", category: "shipping", title: t("Do you offer gift wrapping?"),
      summary: t("How to add gift wrapping and a message."),
      keywords: "gift wrap wrapping present message note packaging",
      blocks: [
        p(c.giftWrapPence ? t("Yes. Choose gift wrapping at checkout for {money} per order.", { money: money(c.giftWrapPence) }) : t("Gift wrapping is offered at checkout when it is available for your order.")),
        p(t("If you are sending something to someone else, enter their address as the delivery address at checkout.")),
      ],
      related: ["delivery-costs", "buy-a-gift-card"],
    },
    // --------------------------------------------------------------- returns
    {
      slug: "returns-policy", category: "returns", title: t("What is your returns policy?"), popular: true,
      summary: t("You have 14 days after receiving your goods to change your mind."),
      keywords: "return policy 14 days refund exchange send back change mind cancel",
      blocks: [
        p(t("If you are buying as a consumer, you can cancel your order and return the goods for any reason within 14 days of receiving them. Tell us clearly (an email is fine) at {mail}, then send the goods back within a further 14 days.", { mail: mail(c) })),
        p(t("We refund the price of the goods, and the standard delivery charge, within 14 days of getting the goods back or of you showing proof of postage, to the payment method you used. You pay the cost of sending items back unless we tell you otherwise.")),
        p(t("Please return items unused and in their original packaging where possible. We may reduce a refund if goods come back damaged or used beyond what is needed to check them.")),
        p(t("Read the full wording in [Delivery and returns](/delivery-returns).")),
      ],
      related: ["how-to-return", "what-cannot-be-returned", "refund-time"],
    },
    {
      slug: "how-to-return", category: "returns", title: t("How do I return or exchange something?"), popular: true,
      summary: t("Step by step: telling us, posting it back and getting your money."),
      keywords: "return exchange swap size wrong send back label process",
      blocks: [
        ol(
          t("[Sign in to your account](/account), open the order and choose to request a return, or email us your order number and which items you are returning."),
          t("We confirm your request and tell you where to send the items."),
          t("Post the items back to us within 14 days of telling us. Keep your proof of postage."),
          t("When your return arrives and is checked, we refund you to the original payment method."),
        ),
        p(t("We do not swap items directly. To exchange something, return the original for a refund and place a new order for the size or item you want, so it is made fresh for you.")),
      ],
      related: ["returns-policy", "refund-time", "what-cannot-be-returned"],
    },
    {
      slug: "what-cannot-be-returned", category: "returns", title: t("What cannot be returned?"),
      summary: t("Gift cards, personalised items and sealed hygiene items."),
      keywords: "non returnable exceptions personalised hygiene make-up skincare gift card",
      blocks: [
        ul(t("Gift cards, once issued."), t("Items made or personalised to your request."), t("Sealed items that cannot be returned for health or hygiene reasons once the seal has been broken, such as make-up and skincare.")),
        p(t("These exceptions do not affect your rights if an item is faulty. See [Something is missing, faulty or not as described](/help/returns/something-is-missing-or-wrong).")),
      ],
      related: ["returns-policy", "something-is-missing-or-wrong"],
    },
    {
      slug: "something-is-missing-or-wrong", category: "returns", title: t("Something is missing, faulty or not as described"), popular: true,
      summary: t("How to ask for a repair, replacement or refund."),
      keywords: "faulty damaged broken wrong item missing replacement misprint defect quality",
      blocks: [
        p(t("Email {mail} with your order number, what is wrong and, if you can, a photo. We will put it right with a replacement or a refund.", { mail: mail(c) })),
        p(t("You have legal rights under the Consumer Rights Act 2015 to a repair, replacement or refund for goods that are faulty, damaged or not as described. These rights are in addition to your 14 day cancellation right and are not affected by the exceptions listed above.")),
        p(t("If an item in your order has not arrived, check the tracking for each parcel first (see [Why did my order come in separate parcels?](/help/orders/separate-parcels)), then contact us.")),
      ],
      related: ["how-to-return", "refund-time"],
    },
    {
      slug: "refund-time", category: "returns", title: t("When will I get my refund?"),
      summary: t("How long refunds take and where the money goes."),
      keywords: "refund how long money back bank card days statement",
      blocks: [
        p(t("Once we have received and checked your return, or agreed a refund, we send it within 14 days to the payment method you used.")),
        p(t("After we send it, your bank or card provider decides how long it takes to appear, which is usually a few working days.")),
        p(t("If it has been longer than that, email {mail} with your order number.", { mail: mail(c) })),
      ],
      related: ["returns-policy", "how-to-return"],
    },
    // -------------------------------------------------------------- payments
    {
      slug: "what-payment-types-can-i-use", category: "payments", title: t("What payment types can I use?"), popular: true,
      summary: t("Cards, Apple Pay, Google Pay, gift cards and more."),
      keywords: "payment methods card visa mastercard apple pay google pay paypal klarna clearpay amazon revolut",
      blocks: [
        p(t("You can pay by debit or credit card, Apple Pay or Google Pay where your device supports them, or with a {name} gift card. {pay}", { name: c.name, pay }).trim()),
        p(t("Which options you see at checkout depends on your device, browser, location and account. See all of them on our [Payment options](/payment-options) page.")),
      ],
      related: ["is-it-safe-to-pay", "how-does-my-charge-look"],
    },
    {
      slug: "is-it-safe-to-pay", category: "payments", title: t("Is it safe to pay on your site?"),
      summary: t("Payments are handled by Stripe, so we never see your card details."),
      keywords: "secure safe security card details stripe 3d secure fraud",
      blocks: [
        p(t("All payments are taken securely by Stripe. You pay on Stripe's own checkout page, so your full card details never touch our servers.")),
        p(t("Your bank may ask you to confirm a payment with an extra step (such as a code or your banking app). That is a normal security check.")),
      ],
      related: ["what-payment-types-can-i-use", "privacy-and-your-data"],
    },
    {
      slug: "how-does-my-charge-look", category: "payments", title: t("How will my charge look on my statement?"),
      summary: t("What to do if you do not recognise a payment."),
      keywords: "statement charge descriptor bank transaction unknown billing",
      blocks: [
        p(t("Your bank statement should show our trading name, {name}, and your bank may add details of the payment processor. Banks word these differently.", { name: c.name })),
        p(t("If you do not recognise a charge, email {mail} with the date and amount and we will match it to an order.", { mail: mail(c) })),
      ],
      related: ["what-payment-types-can-i-use", "why-was-my-order-cancelled"],
    },
    {
      slug: "discount-codes", category: "payments", title: t("How do I use a discount code?"), popular: true,
      summary: t("Where to enter a code and why one might not work."),
      keywords: "discount code promo promotion coupon voucher offer sale not working",
      blocks: [
        p(t("Enter your code in your basket or at checkout and the discount is taken off your total.")),
        p(t("A code may not work if it has expired, has reached its limit, needs a minimum spend, or does not apply to the items in your basket. The message shown when you apply it says which.")),
        p(t("Gift cards are not discount codes: you enter a gift card code in the gift card box and its balance is taken off your order.")),
      ],
      related: ["redeem-a-gift-card", "what-payment-types-can-i-use"],
    },
    // ------------------------------------------------------------ gift cards
    {
      slug: "buy-a-gift-card", category: "gift-cards", title: t("How do I buy and send a gift card?"),
      summary: t("Pick an amount and a design, add a message and we email it."),
      keywords: "gift card buy send email present voucher amount design message",
      blocks: [
        p(t("Gift cards are sent by email as a unique code. Go to [Send a gift card](/gift-cards/send), choose an amount and a design, write a message and enter who it is for. You can send it to them directly or to yourself to pass on.")),
        p(t("Gift cards are not refundable for cash once issued. If something goes wrong with delivery, contact us and we will resend it.")),
      ],
      related: ["redeem-a-gift-card", "check-gift-card-balance"],
    },
    {
      slug: "redeem-a-gift-card", category: "gift-cards", title: t("How do I spend a gift card?"),
      summary: t("Enter the code at checkout."),
      keywords: "redeem use spend apply gift card code checkout",
      blocks: [
        ol(t("Add what you want to your basket."), t("In the basket or at checkout, enter the gift card code in the gift card box and apply it."), t("The balance is taken off your order. Any balance left over stays on the card for next time.")),
        p(t("If the card does not cover the whole order, you can pay the rest with another payment method.")),
      ],
      related: ["check-gift-card-balance", "buy-a-gift-card"],
    },
    {
      slug: "check-gift-card-balance", category: "gift-cards", title: t("How do I check my gift card balance?"),
      summary: t("Look up what is left on a card."),
      keywords: "gift card balance check remaining expiry lookup",
      blocks: [
        p(t("Enter your code on the [gift card balance page](/gift-cards/balance) to see what is left and whether the card is still usable.")),
        p(t("If a card says it cannot be used and you think that is a mistake, email {mail} with the code and the email it was sent to.", { mail: mail(c) })),
      ],
      related: ["redeem-a-gift-card", "buy-a-gift-card"],
    },
    // -------------------------------------------------------------- products
    {
      slug: "printed-to-order", category: "products", title: t("What does printed to order mean?"),
      summary: t("Why products are made after you buy, and what that means for you."),
      keywords: "print on demand made to order printify production quality colours",
      blocks: [
        p(t("Many of our products are printed only once you order them. That means less waste and no unsold stock, and it is why production takes a few working days before your order ships.")),
        p(t("Colours can look slightly different on screen than in print, and from one print run to the next. Product pages describe the item and what it is made from.")),
      ],
      related: ["when-will-it-arrive", "sizing-and-fit"],
    },
    {
      slug: "sizing-and-fit", category: "products", title: t("How do I choose my size?"),
      summary: t("Where to find size guides and what to do if it does not fit."),
      keywords: "size sizing fit guide measurements chart small large",
      blocks: [
        p(t("Clothing pages have a size guide with measurements. Measure a similar item you already own and compare it to the guide.")),
        p(t("If it does not fit, you can return it within 14 days of receiving it and order the size you want. See [How do I return or exchange something?](/help/returns/how-to-return).")),
      ],
      related: ["how-to-return", "printed-to-order"],
    },
    {
      slug: "ask-a-question-about-a-product", category: "products", title: t("I have a question before I buy"),
      summary: t("How to ask about an item you are thinking of buying."),
      keywords: "question product pre-sale before buy ask details stock restock notify",
      blocks: [
        p(t("Check the product page first for its description, sizes and materials. If you still need an answer, email {mail} and tell us which product you mean.", { mail: mail(c) })),
        p(t("If something is out of stock, product pages let you ask to be told when it is back.")),
      ],
      related: ["sizing-and-fit", "printed-to-order"],
    },
    // --------------------------------------------------------------- account
    {
      slug: "sign-in-and-reset", category: "account", title: t("How do I sign in or reset my password?"),
      summary: t("Getting into your account, and what to do if you are locked out."),
      keywords: "login sign in password reset forgot account locked email",
      blocks: [
        p(t("Go to [Sign in](/account/login). If you have forgotten your password, choose the reset option and we email you a link.")),
        p(t("After several wrong attempts you are asked to wait before trying again. This protects your account. If you do not get the email, check your spam folder, then contact us.")),
      ],
      related: ["where-is-my-order", "privacy-and-your-data"],
    },
    {
      slug: "wishlist", category: "account", title: t("How does my wishlist work?"),
      summary: t("Saving items for later."),
      keywords: "wishlist save favourites heart later list",
      blocks: [
        p(t("Tap the heart on any product to save it to your wishlist. Open your wishlist from the heart in the header to see everything you saved.")),
        p(t("Without an account, your wishlist is kept on the device you used. Clearing your browser data removes it.")),
      ],
      related: ["sign-in-and-reset"],
    },
    // --------------------------------------------------------- things to know
    {
      slug: "accessibility", category: "things-to-know", title: t("Accessibility"),
      summary: t("How we make the shop usable for everyone, and how to tell us about a problem."),
      keywords: "accessibility accessible screen reader disability wcag help assistance",
      blocks: [
        p(t("We want everyone to be able to shop here. Read our [accessibility statement](/accessibility) for how we do that and what we are still working on.")),
        p(t("If you find something hard to use, or need help placing an order, email {mail} and tell us what happened. We will help.", { mail: mail(c) })),
      ],
      related: ["contact-us"],
    },
    {
      slug: "privacy-and-your-data", category: "things-to-know", title: t("How do you use my personal data?"),
      summary: t("What we collect, why, and your choices."),
      keywords: "privacy data gdpr personal information cookies delete unsubscribe marketing emails",
      blocks: [
        p(t("Our [privacy policy](/privacy) explains what we collect, why, who we share it with and your rights, including asking us to see or delete your data. Our [cookie policy](/cookies) explains cookies, and you can change your choices at any time from the link in the footer.")),
        p(t("To stop marketing emails, use the unsubscribe link in any of them.")),
      ],
      related: ["is-it-safe-to-pay", "sign-in-and-reset"],
    },
    {
      slug: "terms", category: "things-to-know", title: t("Terms of use"),
      summary: t("The terms of sale and of using this website."),
      keywords: "terms conditions disclaimer legal small print",
      blocks: [p(t("Our [terms of use](/terms) set out the terms of sale and of using this site. Nothing in them affects your legal rights as a consumer."))],
      related: ["returns-policy", "privacy-and-your-data"],
    },
    {
      slug: "contact-us", category: "things-to-know", title: t("How do I contact you?"),
      summary: t("Ways to reach us and what to include."),
      keywords: "contact email phone speak call message support help team",
      blocks: [
        p(c.email ? t("Use our [contact form](/help/contact) or email {mail}. Include your order number if you have one, and what you need help with, and we will get back to you as soon as we can.", { mail: mail(c) }) : t("Use our [contact form](/help/contact). Include your order number if you have one, and what you need help with, and we will get back to you as soon as we can.")),
        p(t("We are a small team and reply by email.")),
      ],
      related: ["where-is-my-order", "returns-policy"],
    },
  ];
}

/* ------------------------------------------------------------------ lookup */

export const articlesIn = (all: HelpArticle[], category: string) => all.filter((a) => a.category === category);
export const articleBySlug = (all: HelpArticle[], category: string, slug: string) => all.find((a) => a.category === category && a.slug === slug);
export const helpPath = (a: Pick<HelpArticle, "category" | "slug">) => `/help/${a.category}/${a.slug}`;
export const popularArticles = (all: HelpArticle[]) => all.filter((a) => a.popular);
export const relatedArticles = (all: HelpArticle[], a: HelpArticle) => a.related.map((s) => all.find((x) => x.slug === s)).filter((x): x is HelpArticle => !!x);

/** Plain text of an article, for searching. */
export const blockText = (b: HelpBlock) => ("p" in b ? b.p : "h" in b ? b.h : "ul" in b ? b.ul.join(" ") : b.ol.join(" ")).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
export const articleText = (a: HelpArticle) => a.blocks.map(blockText).join(" ");

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9£\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);
const STOP = new Set(["the", "and", "for", "can", "how", "what", "why", "do", "does", "you", "your", "are", "with", "that", "this", "have", "has", "from", "was", "get", "did", "will", "not", "but", "any", "all"]);

/** Ranked search: title words count most, then keywords and summary, then the body. Every word of the query must appear somewhere. */
export function searchHelp(all: HelpArticle[], query: string, limit = 20): HelpArticle[] {
  const terms = words(query).filter((w) => !STOP.has(w));
  if (!terms.length) return [];
  const stem = (w: string) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w);
  const scored: { a: HelpArticle; score: number }[] = [];
  for (const a of all) {
    const title = a.title.toLowerCase(), meta = `${a.keywords} ${a.summary}`.toLowerCase(), body = articleText(a).toLowerCase();
    let score = 0, ok = true;
    for (const t of terms) {
      const s = stem(t);
      const inTitle = title.includes(s), inMeta = meta.includes(s), inBody = body.includes(s);
      if (!inTitle && !inMeta && !inBody) { ok = false; break; }
      score += (inTitle ? 6 : 0) + (inMeta ? 3 : 0) + (inBody ? 1 : 0);
    }
    if (ok) scored.push({ a, score: score + (a.popular ? 0.5 : 0) });
  }
  return scored.sort((x, y) => y.score - x.score).slice(0, limit).map((x) => x.a);
}

/** Split "text [label](/path) more" into pieces so a page can render real links without raw HTML. Only same-site paths and mailto: links are kept. */
export type HelpPiece = { text: string; href?: string };
export function helpPieces(s: string): HelpPiece[] {
  const out: HelpPiece[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    const href = m[2];
    out.push(href.startsWith("/") || href.startsWith("mailto:") ? { text: m[1], href } : { text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}
