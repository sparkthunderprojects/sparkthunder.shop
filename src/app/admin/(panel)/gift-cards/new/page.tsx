import { requireAdmin } from "@/lib/admin/auth";
import { IssueForm } from "./IssueForm";

export const metadata = { title: "Issue a gift card" };

export default async function NewGiftCard() {
  await requireAdmin();
  return <IssueForm />;
}
