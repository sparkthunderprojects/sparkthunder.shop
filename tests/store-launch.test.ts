import { describe, expect, it } from "vitest";
import { launchChecks, launchScore, type LaunchFacts } from "@/lib/store-launch";

const ready: LaunchFacts = { isOriginal: false, name: "Miss Petty", defaultName: "Sparkthunder Shop", logoUrl: "/l.png", description: "Beauty products made with care for everyday glow.", domains: 1, stripe: true, stripeWebhook: true, email: true, supportEmail: "hi@misspetty.com", shippingCountries: 3, zones: 0, vatEnabled: false, vatNumber: "", businessAddress: "1 High Street, London, UK", published: 5, publishedWithoutImage: 0, printifyProducts: 0, printifyConnected: false, paidOrders: 2, themeChosen: true };
const get = (f: LaunchFacts, id: string) => launchChecks(f).find((c) => c.id === id)!;

describe("store launch checklist", () => {
  it("a fully set up store is ready with nothing left", () => {
    const s = launchScore(launchChecks(ready));
    expect(s.ready).toBe(true); expect(s.done).toBe(s.total); expect(s.percent).toBe(100);
  });
  it("a brand-new store lists what is missing and is not ready", () => {
    const f: LaunchFacts = { ...ready, name: "Sparkthunder Shop", logoUrl: "", domains: 0, stripe: false, stripeWebhook: false, email: false, supportEmail: "", shippingCountries: 0, published: 0, paidOrders: 0, themeChosen: false, description: "", businessAddress: "" };
    const s = launchScore(launchChecks(f));
    expect(s.ready).toBe(false); expect(s.requiredDone).toBeLessThan(s.requiredTotal);
    for (const id of ["name", "logo", "products", "domain", "stripe", "webhook", "email", "support", "shipping"]) expect(get(f, id).ok, id).toBe(false);
    expect(get(f, "logo").href).toBe("/admin/store");
  });
  it("the original store may keep the default name", () => { expect(get({ ...ready, isOriginal: true, name: "Sparkthunder Shop" }, "name").ok).toBe(true); });
  it("recommended items do not block launch", () => {
    const f = { ...ready, description: "", themeChosen: false, businessAddress: "", paidOrders: 0 };
    const s = launchScore(launchChecks(f));
    expect(s.ready).toBe(true); expect(s.done).toBeLessThan(s.total);
  });
  it("needs a photo on every published product", () => { expect(get({ ...ready, publishedWithoutImage: 2 }, "images")).toMatchObject({ ok: false, detail: "2 product(s) have no photo." }); });
  it("only asks for Printify when products use it", () => {
    expect(launchChecks(ready).some((c) => c.id === "printify")).toBe(false);
    const f = { ...ready, printifyProducts: 3 };
    expect(get(f, "printify").ok).toBe(false); expect(get({ ...f, printifyConnected: true }, "printify").ok).toBe(true);
  });
  it("VAT on without a number is flagged; VAT off is fine", () => {
    expect(get({ ...ready, vatEnabled: true, vatNumber: "" }, "vat").ok).toBe(false);
    expect(get({ ...ready, vatEnabled: true, vatNumber: "GB123" }, "vat").ok).toBe(true);
    expect(get(ready, "vat").ok).toBe(true);
  });
  it("support email must look like an email", () => { expect(get({ ...ready, supportEmail: "nope" }, "support").ok).toBe(false); });
});
