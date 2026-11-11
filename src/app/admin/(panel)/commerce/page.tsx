import { requireAdmin } from "@/lib/admin/auth";
import { getCategories } from "@/lib/catalog";
import { getCommerce } from "@/lib/commerce";
import { currentStoreId } from "@/lib/db/stores";
import { getStoreSecrets } from "@/lib/secrets";
import { CommerceForm } from "./CommerceForm";

export const metadata = { title: "Shipping and payments" };

export default async function CommercePage() {
  await requireAdmin("settings");
  const [commerce, secrets, categories] = await Promise.all([getCommerce(), currentStoreId().then(getStoreSecrets), getCategories()]);
  return <CommerceForm commerce={commerce} categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} status={{ stripe: Boolean(secrets.stripeSecret), webhook: Boolean(secrets.stripeWebhookSecret), email: Boolean(secrets.resendKey), emailFrom: secrets.emailFrom }} />;
}
