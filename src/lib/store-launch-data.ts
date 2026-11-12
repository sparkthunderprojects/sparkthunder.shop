import { serviceClient } from "@/lib/db/clients";
import { DEFAULT_STORE_ID } from "@/lib/db/stores";
import { normaliseCommerce, type CommerceSettings } from "@/lib/commerce-config";
import { getStoreSecrets } from "@/lib/secrets";
import { DEFAULT_STORE, normaliseStore, type StoreSettings } from "@/lib/store-config";
import { launchChecks, launchScore, type LaunchCheck, type LaunchFacts } from "@/lib/store-launch";

/** Gathers the facts about one store and runs the launch checklist. Needs the service key (reads credentials). */
export async function loadLaunch(storeId: string, domains: string[]): Promise<{ checks: LaunchCheck[]; score: ReturnType<typeof launchScore> } | null> {
  const db = serviceClient(storeId);
  if (!db) return null;
  const [{ data: settings }, { data: products }, { count: paid }, secrets] = await Promise.all([
    db.from("settings").select("key, value").in("key", ["store", "commerce", "theme"]),
    db.from("products").select("published, images, printify_id"),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "shipped"]),
    getStoreSecrets(storeId),
  ]);
  const byKey = new Map(((settings ?? []) as { key: string; value: unknown }[]).map((s) => [s.key, s.value]));
  const store: StoreSettings = normaliseStore(byKey.get("store") as Partial<StoreSettings> | undefined);
  const commerce: CommerceSettings = normaliseCommerce(byKey.get("commerce") as Partial<CommerceSettings> | undefined);
  const live = ((products ?? []) as { published: boolean | null; images: string[] | null; printify_id?: string | null }[]).filter((p) => p.published !== false);
  const f: LaunchFacts = {
    isOriginal: storeId === DEFAULT_STORE_ID, name: store.name, defaultName: DEFAULT_STORE.name, logoUrl: store.logoUrl, description: store.description,
    domains: domains.length, stripe: !!secrets.stripeSecret, stripeWebhook: !!secrets.stripeWebhookSecret, email: !!secrets.resendKey && !!secrets.emailFrom, supportEmail: commerce.supportEmail,
    shippingCountries: commerce.shippingCountries.length, zones: commerce.shippingZones.length, vatEnabled: commerce.vatEnabled, vatNumber: commerce.vatNumber, businessAddress: commerce.businessAddress,
    published: live.length, publishedWithoutImage: live.filter((p) => !(p.images ?? []).length).length,
    printifyProducts: live.filter((p) => p.printify_id).length, printifyConnected: !!secrets.printifyToken && !!secrets.printifyShopId,
    paidOrders: paid ?? 0, themeChosen: byKey.has("theme"),
  };
  const checks = launchChecks(f);
  return { checks, score: launchScore(checks) };
}
