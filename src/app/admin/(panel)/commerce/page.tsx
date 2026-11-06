import { requireAdmin } from "@/lib/admin/auth";
import { getCommerce } from "@/lib/commerce";
import { currentStoreId } from "@/lib/db/stores";
import { getStoreSecrets } from "@/lib/secrets";
import { CommerceForm } from "./CommerceForm";

export const metadata = { title: "Shipping and payments" };

export default async function CommercePage() {
  await requireAdmin();
  const [commerce, secrets] = await Promise.all([getCommerce(), currentStoreId().then(getStoreSecrets)]);
  return <CommerceForm commerce={commerce} status={{ stripe: Boolean(secrets.stripeSecret), webhook: Boolean(secrets.stripeWebhookSecret), email: Boolean(secrets.resendKey), emailFrom: secrets.emailFrom }} />;
}
