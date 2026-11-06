import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";
import { storeTag } from "@/lib/tags";
import { currentStoreId } from "@/lib/db/stores";

export type ReviewRow = {
  id: string; product_slug: string; email: string; name: string; rating: number; title: string; body: string;
  photos: string[] | null; verified: boolean; status: "pending" | "approved" | "rejected"; created_at: string;
};
export type PublicReview = { id: string; name: string; rating: number; title: string; body: string; photos: string[]; createdAt: string };
export type ReviewSummary = { count: number; average: number; reviews: PublicReview[] };

export const REVIEWS_TAG = "reviews";

/** Approved reviews for a product (only verified buyers can post them). Cached, busted when one is moderated. */
export const getReviews = async (slug: string) => {
  const storeId = await currentStoreId();
  return unstable_cache(
    async (): Promise<ReviewSummary> => {
      const db = publicClient(storeId);
      if (!db) return { count: 0, average: 0, reviews: [] };
      const { data, error } = await db.from("reviews").select("id, product_slug, name, rating, title, body, photos, verified, status, created_at").eq("product_slug", slug).eq("status", "approved").order("created_at", { ascending: false }).limit(50);
      if (error || !data) return { count: 0, average: 0, reviews: [] };
      const rows = data as ReviewRow[];
      const average = rows.length ? Math.round((rows.reduce((n, r) => n + r.rating, 0) / rows.length) * 10) / 10 : 0;
      return { count: rows.length, average, reviews: rows.map((r) => ({ id: r.id, name: r.name, rating: r.rating, title: r.title, body: r.body, photos: r.photos ?? [], createdAt: r.created_at })) };
    },
    ["reviews", storeId, slug],
    { tags: [storeTag(REVIEWS_TAG, storeId)], revalidate: 300 },
  )();
};
