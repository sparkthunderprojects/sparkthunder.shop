"use server";

import { revalidatePath } from "next/cache";
import { bustTag } from "@/lib/tags";
import { requireAdminAction } from "@/lib/admin/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { slugify } from "@/lib/seo/text";

type Result = { ok: true } | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export type CollectionInput = {
  slug: string; name: string; description: string; image: string;
  launchAt: string; productSlugs: string[]; sortOrder: number; published: boolean; isNew: boolean;
};

async function bust(slug: string) {
  await bustTag(CATALOG_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/collections");
  revalidatePath(`/collections/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/collections");
}

export async function saveCollectionAction(i: CollectionInput): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const name = i.name.trim();
    if (!name) return { ok: false, error: "Give the collection a name." };
    const slug = (i.slug.trim() || slugify(name)).toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { ok: false, error: "The web address can only use lowercase letters, numbers and dashes." };
    let launch: string | null = null;
    if (i.launchAt) {
      const t = Date.parse(i.launchAt);
      if (Number.isNaN(t)) return { ok: false, error: "Enter a valid launch date or leave it empty." };
      launch = new Date(t).toISOString();
    }
    if (i.isNew) {
      const dup = await db.from("collections").select("slug").eq("slug", slug).maybeSingle();
      if (dup.data) return { ok: false, error: "A collection with that web address already exists." };
    }
    const row = {
      slug, name, description: i.description.trim(), image: i.image.trim(), launch_at: launch,
      product_slugs: [...new Set(i.productSlugs)], sort_order: Math.round(i.sortOrder) || 0, published: i.published,
    };
    const { error } = i.isNew ? await db.from("collections").insert(row) : await db.from("collections").update(row).eq("slug", slug);
    if (error) return { ok: false, error: error.message };
    await bust(slug);
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function deleteCollectionAction(slug: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const { error } = await db.from("collections").delete().eq("slug", slug);
    if (error) return { ok: false, error: error.message };
    await bust(slug);
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
