import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getCard, listLedger } from "@/lib/giftcards/ledger";
import { getCommerce } from "@/lib/commerce";
import { GiftCardDetail } from "./GiftCardDetail";

export const metadata = { title: "Gift card" };

export default async function GiftCardPage({ params }: PageProps<"/admin/gift-cards/[id]">) {
  const { id } = await params;
  const { db } = await requireAdmin("marketing");
  const card = await getCard(db, id);
  if (!card) notFound();
  return <GiftCardDetail card={card} ledger={await listLedger(db, id)} prefix={(await getCommerce()).codePrefix} />;
}
