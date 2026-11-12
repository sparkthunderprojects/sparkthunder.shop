/**
 * Store launch checklist: what a store still needs before it can take real orders.
 * Pure: the data is gathered elsewhere, so every rule here is easy to test.
 */
export type LaunchFacts = {
  isOriginal: boolean;
  name: string; defaultName: string; logoUrl: string; description: string;
  domains: number;
  stripe: boolean; stripeWebhook: boolean; email: boolean; supportEmail: string;
  shippingCountries: number; zones: number;
  vatEnabled: boolean; vatNumber: string; businessAddress: string;
  published: number; publishedWithoutImage: number; printifyProducts: number; printifyConnected: boolean;
  paidOrders: number;
  themeChosen: boolean;
};
export type LaunchGroup = "Brand" | "Selling" | "Money and email" | "Shipping" | "Legal";
export type LaunchCheck = { id: string; group: LaunchGroup; label: string; required: boolean; ok: boolean; detail: string; href: string };

export function launchChecks(f: LaunchFacts): LaunchCheck[] {
  const c = (id: string, group: LaunchGroup, label: string, required: boolean, ok: boolean, okText: string, todo: string, href: string): LaunchCheck => ({ id, group, label, required, ok, detail: ok ? okText : todo, href });
  const out: LaunchCheck[] = [
    c("name", "Brand", "Store has its own name", true, f.isOriginal || (f.name.trim() !== "" && f.name !== f.defaultName), f.name, "Still using the default name. Set the store name.", "/admin/store"),
    c("logo", "Brand", "Logo uploaded", true, f.logoUrl.trim() !== "", "Logo is set.", "No logo yet. Upload one under Brand and design.", "/admin/store"),
    c("about", "Brand", "Description written", false, f.description.trim().length >= 40, "Description is set.", "Write a short description (used in the footer and search results).", "/admin/store"),
    c("theme", "Brand", "Look and layout chosen", false, f.themeChosen, "A preset or layout has been chosen.", "Pick a preset or layout under Theme and layout so this brand has its own look.", "/admin/theme"),
    c("products", "Selling", "At least one published product", true, f.published > 0, `${f.published} published.`, "No published products yet.", "/admin/products"),
    c("images", "Selling", "Every published product has a photo", true, f.published > 0 && f.publishedWithoutImage === 0, "All have photos.", f.published === 0 ? "No published products yet." : `${f.publishedWithoutImage} product(s) have no photo.`, "/admin/products"),
    c("domain", "Selling", "Domain connected", true, f.domains > 0, `${f.domains} domain(s) on this store.`, "No domain added. Add one under Domains and follow its steps.", "/admin/domains"),
    c("stripe", "Money and email", "Stripe payments connected", true, f.stripe, "Stripe key is set.", "Add this store's Stripe key under Shipping and payments.", "/admin/commerce"),
    c("webhook", "Money and email", "Stripe webhook secret set", true, f.stripeWebhook, "Webhook secret is set.", "Add the Stripe webhook secret, otherwise paid orders won't be recorded.", "/admin/commerce"),
    c("email", "Money and email", "Order emails can be sent", true, f.email, "Resend key and from-address are set.", "Add the Resend key and from-address so customers get confirmations.", "/admin/commerce"),
    c("support", "Money and email", "Support email set", true, /^\S+@\S+\.\S+$/.test(f.supportEmail), `Alerts and replies go to ${f.supportEmail}.`, "Add a support email. It is also where order problems are reported.", "/admin/commerce"),
    c("shipping", "Shipping", "Delivery countries and prices set", true, f.zones > 0 || f.shippingCountries > 0, f.zones ? `${f.zones} delivery zone(s).` : `Ships to ${f.shippingCountries} country(ies).`, "No delivery countries yet.", "/admin/commerce"),
    c("address", "Legal", "Business address for invoices", false, f.businessAddress.trim().length >= 10, "Address is set.", "Add the registered business address printed on invoices.", "/admin/commerce"),
    c("vat", "Legal", f.vatEnabled ? "VAT number entered" : "VAT settings reviewed", false, !f.vatEnabled || f.vatNumber.trim() !== "", f.vatEnabled ? `VAT number ${f.vatNumber}.` : "VAT is off. Turn it on once the business is VAT registered.", "VAT is on but no VAT number is entered, so invoices will show none.", "/admin/commerce"),
  ];
  if (f.printifyProducts > 0) out.push(c("printify", "Selling", "Print-on-demand connected", true, f.printifyConnected, "Printify token and shop are set.", `${f.printifyProducts} product(s) use Printify but no Printify token is set.`, "/admin/commerce"));
  out.push(c("test-order", "Selling", "Has taken an order", false, f.paidOrders > 0, `${f.paidOrders} paid order(s).`, "No paid orders yet. Place a real test order and refund it to prove the whole flow.", "/admin/orders"));
  return out;
}

export function launchScore(checks: LaunchCheck[]) {
  const req = checks.filter((x) => x.required), done = checks.filter((x) => x.ok);
  const reqDone = req.filter((x) => x.ok).length;
  return { done: done.length, total: checks.length, requiredDone: reqDone, requiredTotal: req.length, ready: reqDone === req.length, percent: Math.round((done.length / Math.max(1, checks.length)) * 100) };
}
