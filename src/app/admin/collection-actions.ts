"use server";

import { logActivity as audit } from "@/lib/admin/activity";

import { revalidatePath } from "next/cache";
import { bustTag } from "@/lib/tags";
import { requireAdminAction } from "@/lib/admin/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { slugify } from "@/lib/seo/text";
import { normaliseRules, normaliseSmartMap, type SmartRules } from "@/lib/smart-collections";
import type { Db } from "@/lib/db/clients";

type Result = { ok: true } | { ok: false; error: string };
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export type CollectionInput = {
  slug: string; name: string; description: string; image: string;
  launchAt: string; productSlugs: string[]; sortOrder: number; published: boolean; isNew: boolean;
  /** When set, the collection fills itself from these rules and the chosen products are ignored. */
  rules?: SmartRules | null;
};

/** Sets or removes the rules of one collection in the store's single "smart_collections" setting. */
async function writeRules(db: Db, slug: string, rules: SmartRules | null): Promise<string | null> {
  const { data } = await db.from("settings").select("value").eq("key", "smart_collections").maybeSingle();
  const map = normaliseSmartMap((data as { value?: unknown } | null)?.value);
  if (rules) map[slug] = rules; else delete map[slug];
  const { error } = await db.from("settings").upsert({ key: "smart_collections", value: map }, { onConflict: "key" });
  return error ? error.message : null;
}

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
    const { db } = await requireAdminAction("catalogue");
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
    const rules = i.rules === undefined ? undefined : normaliseRules(i.rules);
    if (i.rules && !rules) return { ok: false, error: "Add at least one complete rule, or switch off automatic filling." };
    if (rules !== undefined) { const rerr = await writeRules(db, slug, rules); if (rerr) return { ok: false, error: rerr }; }
    await bust(slug);
    await audit("collection.save", `Saved collection ${i.slug}`, { type: "collection", id: i.slug });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function deleteCollectionAction(slug: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction("catalogue");
    const { error } = await db.from("collections").delete().eq("slug", slug);
    if (error) return { ok: false, error: error.message };
    await writeRules(db, slug, null);
    await bust(slug);
    await audit("collection.delete", `Deleted collection ${slug}`, { type: "collection", id: slug });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
