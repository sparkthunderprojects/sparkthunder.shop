import { requireAdmin } from "@/lib/admin/auth";
import { getStore } from "@/lib/store";
import { getCommerce } from "@/lib/commerce";
import { siteOrigin } from "@/lib/site-info";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { giftThemes } from "@/lib/giftcards/themes";
import { IssueForm } from "./IssueForm";

export const metadata = { title: "Issue a gift card" };

export default async function NewGiftCard() {
  await requireAdmin();
  const store = await getStore(), original = (await currentStoreId()) === DEFAULT_STORE_ID;
  return <IssueForm store={{ name: store.name, origin: await siteOrigin(), prefix: (await getCommerce()).codePrefix, themes: giftThemes(store, original) }} />;
}
