"use server";

import { HEX } from "@/lib/variants";
import { LIMITS, rateLimit, wait } from "@/lib/ratelimit";
import { revalidatePath } from "next/cache";
import { bustTag } from "@/lib/tags";
import { currentStoreId } from "@/lib/db/stores";
import { requireAdminAction } from "@/lib/admin/auth";
import { notifyBackInStock } from "@/lib/shop/alerts";
import * as repo from "@/lib/admin/repo";
import { CATALOG_TAG } from "@/lib/catalog";
import { sessionClient } from "@/lib/db/clients";
import { pingIndexNow } from "@/lib/seo/indexnow";
import { slugify } from "@/lib/seo/text";
import type { Category, Franchise, Product } from "@/lib/types";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string> };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** After a stock change, email anyone waiting for something that is now available. Never blocks or fails the save. */
async function notifyRestocks(db: Parameters<typeof notifyBackInStock>[0]) {
  try { await notifyBackInStock(db); } catch (e) { console.error("[stock-alerts]", e); }
}

async function refresh(paths: string[] = []) {
  await bustTag(CATALOG_TAG);
  await bustTag("redirects");
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
  return pingIndexNow(paths);
}
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

// ------------------------------------------------------------------ auth
export async function loginAction(email: string, password: string): Promise<Result> {
  // Throttle password guessing: per connection, and per email address (so guesses spread over many connections are caught too).
  const byIp = await rateLimit("login", LIMITS.login);
  const byEmail = await rateLimit("loginEmail", LIMITS.loginEmail, `email:${email.trim().toLowerCase()}`);
  if (!byIp.ok || !byEmail.ok) return { ok: false, error: `Too many sign-in attempts. Please wait ${wait((byIp.ok ? byEmail : byIp) as Extract<typeof byIp, { ok: false }>)} and try again.` };
  const db = await sessionClient();
  if (!db) return { ok: false, error: "Supabase is not configured for this site yet." };
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: "That email and password did not match." };
  const { data } = await db.auth.getUser();
  const { data: row } = await db.from("admin_users").select("user_id").eq("user_id", data.user?.id ?? "").maybeSingle();
  if (!row) { await db.auth.signOut(); return { ok: false, error: "This account is not an admin. Ask an existing admin to add it." }; }
  return { ok: true };
}
export async function logoutAction(): Promise<Result> {
  const db = await sessionClient();
  await db?.auth.signOut();
  return { ok: true };
}

// ------------------------------------------------------------------ products
export async function saveProductAction(p: Product, originalSlug: string | null): Promise<Result<{ slug: string }>> {
  try {
    const { db } = await requireAdminAction();
    const fields: Record<string, string> = {};
    p = { ...p, slug: p.slug.trim(), name: p.name.trim(), sku: p.sku.trim() };
    if (!p.name) fields.name = "Enter a product name.";
    if (!SLUG.test(p.slug)) fields.slug = "Use lowercase letters, numbers and single hyphens only.";
    if (!p.sku) fields.sku = "Enter a SKU.";
    if (!Number.isInteger(p.pricePence) || p.pricePence < 0) fields.price = "Enter a valid price.";
    if (p.comparePricePence != null && p.comparePricePence <= p.pricePence) fields.compare = "The compare-at price must be higher than the price.";
    if (!p.franchiseSlug) fields.franchise = "Choose a franchise.";
    if (!p.categorySlug) fields.category = "Choose a category.";
    if (p.seoTitle && p.seoTitle.length > 120) fields.seoTitle = "Keep the SEO title under 120 characters.";
    if (p.seoDescription && p.seoDescription.length > 320) fields.seoDescription = "Keep the meta description under 320 characters.";
    if (p.canonicalUrl && !/^https?:\/\//.test(p.canonicalUrl)) fields.canonical = "The canonical URL must start with https://";
    const vnames = (p.variants ?? []).map((v) => v.name.trim());
    const optNames = (p.optionNames ?? []).map((n) => n.trim()).filter(Boolean);
    if (vnames.some((n) => !n)) fields.variants = "Every variant needs a name.";
    else if (new Set(vnames.map((n) => n.toLowerCase())).size !== vnames.length) fields.variants = "Two variants have the same name. Each combination can only be listed once.";
    else if (vnames.some((n) => n.includes("::"))) fields.variants = 'Variant names cannot contain "::".';
    else if (new Set((p.variants ?? []).map((v) => v.sku.trim()).filter(Boolean)).size !== (p.variants ?? []).filter((v) => v.sku.trim()).length) fields.variants = "Two variants share a SKU. Each SKU must be unique.";
    else if (vnames.length && new Set(vnames.map((n) => n.split("/").length)).size > 1) fields.variants = 'Variant names must all use the same number of options, e.g. "Rose / 30ml".';
    else if (vnames.length && optNames.length > 1 && vnames.some((n) => n.split("/").length !== optNames.length)) fields.variants = `Each variant name needs ${optNames.length} values separated by " / " to match the option names.`;
    else if ((p.variants ?? []).some((v) => v.comparePricePence != null && v.comparePricePence <= (v.pricePence ?? p.pricePence))) fields.variants = "A variant's compare-at price must be higher than its price.";
    const bundle = (p.bundleItems ?? []).map((i) => ({ slug: String(i.slug ?? "").trim(), qty: Math.floor(Number(i.qty)) })).filter((i) => i.slug);
    if (bundle.length) {
      if (bundle.length < 2) fields.bundle = "A bundle needs at least two products. Remove the bundle items to make this a normal product.";
      else if (new Set(bundle.map((i) => i.slug)).size !== bundle.length) fields.bundle = "Each product can only be listed once. Increase its quantity instead.";
      else if (bundle.some((i) => i.slug === p.slug || originalSlug === i.slug)) fields.bundle = "A bundle cannot contain itself.";
      else if (bundle.some((i) => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 10)) fields.bundle = "Quantities must be between 1 and 10.";
      else {
        const { data } = await db.from("products").select("slug,variants,bundle_items").in("slug", bundle.map((i) => i.slug));
        const rows = (data ?? []) as { slug: string; variants: unknown[] | null; bundle_items: unknown[] | null }[];
        const missing = bundle.find((i) => !rows.some((r) => r.slug === i.slug));
        const withVariants = rows.find((r) => (r.variants ?? []).length > 0);
        const nested = rows.find((r) => (r.bundle_items ?? []).length > 0);
        if (missing) fields.bundle = `"${missing.slug}" no longer exists.`;
        else if (withVariants) fields.bundle = `"${withVariants.slug}" has size/colour options. Bundles can only contain products without variants.`;
        else if (nested) fields.bundle = `"${nested.slug}" is itself a bundle. Bundles cannot contain other bundles.`;
      }
    }
    if (Object.keys(fields).length) return { ok: false, error: "Please fix the highlighted fields.", fields };

    const images = p.images.map((s) => s.trim()).filter(Boolean);
    const clean: Product = {
      ...p, images, imageAlts: images.map((_, i) => (p.imageAlts?.[i] ?? "").trim()),
      details: p.details.map((d) => d.trim()).filter(Boolean), tags: (p.tags ?? []).map((t) => t.trim()).filter(Boolean),
      variants: (p.variants ?? []).map((v) => ({ ...v, name: v.name.split("/").map((x) => x.trim()).join(" / "), sku: v.sku.trim(), image: v.image?.trim() || undefined })),
      optionNames: optNames.slice(0, 3),
      swatches: Object.fromEntries(Object.entries(p.swatches ?? {}).filter(([k, v]) => k.trim() && HEX.test(v)).slice(0, 60)),
      bundleItems: bundle,
      createdAt: p.createdAt || new Date().toISOString().slice(0, 10),
    };
    // With per-variant stock the product total is derived, so the product sells out when every option has.
    if (clean.trackStock && clean.variants?.length) clean.stockQty = clean.variants.reduce((n, v) => n + (Number(v.stockQty) || 0), 0);
    await repo.writeProduct(db, clean, originalSlug);

    const changed = [`/products/${clean.slug}`];
    if (originalSlug && originalSlug !== clean.slug) {
      await repo.addRedirect(db, { from_path: `/products/${originalSlug}`, to_path: `/products/${clean.slug}`, note: "Slug changed" });
    }
    await refresh(changed);
    await notifyRestocks(db);
    revalidatePath("/admin", "layout");
    return { ok: true, slug: clean.slug };
  } catch (e) {
    const m = message(e);
    return { ok: false, error: /sku_key|duplicate key/.test(m) ? "That slug or SKU is already used by another product." : m };
  }
}

export async function deleteProductAction(slug: string, redirectTo: string | null): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const product = await repo.getProductRaw(db, slug);
    await repo.deleteRow(db, "products", slug);
    // Keep the old URL's search value: send it to the category page (or a chosen page) with a 301.
    const to = redirectTo ?? (product ? `/categories/${product.categorySlug}` : "/shop");
    await repo.addRedirect(db, { from_path: `/products/${slug}`, to_path: to, note: "Product deleted" });
    await refresh([`/products/${slug}`]);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function bulkProductsAction(slugs: string[], action: "publish" | "unpublish" | "feature" | "unfeature" | "mark-new" | "unmark-new" | "in-stock" | "out-of-stock"): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const patch: Record<string, unknown> = {
      publish: { published: true }, unpublish: { published: false }, feature: { is_featured: true }, unfeature: { is_featured: false },
      "mark-new": { is_new: true }, "unmark-new": { is_new: false }, "in-stock": { in_stock: true }, "out-of-stock": { in_stock: false },
    }[action];
    await repo.patchProducts(db, slugs, patch);
    await refresh(slugs.map((s) => `/products/${s}`));
    if (action === "in-stock") await notifyRestocks(db);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

// ------------------------------------------------------------------ franchises & categories
function checkTaxonomy(x: { slug: string; name: string; seoTitle?: string; seoDescription?: string }) {
  const fields: Record<string, string> = {};
  if (!x.name.trim()) fields.name = "Enter a name.";
  if (!SLUG.test(x.slug)) fields.slug = "Use lowercase letters, numbers and single hyphens only.";
  if (x.seoTitle && x.seoTitle.length > 120) fields.seoTitle = "Keep the SEO title under 120 characters.";
  if (x.seoDescription && x.seoDescription.length > 320) fields.seoDescription = "Keep the meta description under 320 characters.";
  return fields;
}

export async function saveFranchiseAction(f: Franchise, originalSlug: string | null): Promise<Result<{ slug: string }>> {
  try {
    const { db } = await requireAdminAction();
    f = { ...f, slug: f.slug.trim() || slugify(f.name), name: f.name.trim() };
    const fields = checkTaxonomy(f);
    if (!/^#[0-9a-fA-F]{6}$/.test(f.accent)) fields.accent = "Use a hex colour like #3a5fc8.";
    f.siteUrl = (f.siteUrl ?? "").trim().replace(/\/+$/, "");
    if (f.siteUrl && !/^https:\/\/[^\s/]+\.[^\s/]+/.test(f.siteUrl)) fields.siteUrl = "Enter the full site address starting with https://";
    if (Object.keys(fields).length) return { ok: false, error: "Please fix the highlighted fields.", fields };
    await repo.writeFranchise(db, f, originalSlug);
    if (originalSlug && originalSlug !== f.slug) await repo.addRedirect(db, { from_path: `/franchises/${originalSlug}`, to_path: `/franchises/${f.slug}`, note: "Slug changed" });
    await refresh([`/franchises/${f.slug}`]);
    revalidatePath("/admin", "layout");
    return { ok: true, slug: f.slug };
  } catch (e) { return { ok: false, error: /duplicate key/.test(message(e)) ? "That slug is already in use." : message(e) }; }
}
export async function saveCategoryAction(c: Category, originalSlug: string | null): Promise<Result<{ slug: string }>> {
  try {
    const { db } = await requireAdminAction();
    c = { ...c, slug: c.slug.trim() || slugify(c.name), name: c.name.trim() };
    const fields = checkTaxonomy(c);
    if (Object.keys(fields).length) return { ok: false, error: "Please fix the highlighted fields.", fields };
    await repo.writeCategory(db, c, originalSlug);
    if (originalSlug && originalSlug !== c.slug) await repo.addRedirect(db, { from_path: `/categories/${originalSlug}`, to_path: `/categories/${c.slug}`, note: "Slug changed" });
    await refresh([`/categories/${c.slug}`]);
    revalidatePath("/admin", "layout");
    return { ok: true, slug: c.slug };
  } catch (e) { return { ok: false, error: /duplicate key/.test(message(e)) ? "That slug is already in use." : message(e) }; }
}
export async function deleteTaxonomyAction(kind: "franchises" | "categories", slug: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const col = kind === "franchises" ? "franchise_slug" : "category_slug";
    const { count } = await db.from("products").select("*", { count: "exact", head: true }).eq(col, slug);
    if ((count ?? 0) > 0) return { ok: false, error: `${count} product${count === 1 ? " still belongs" : "s still belong"} to this. Move or delete them first.` };
    await repo.deleteRow(db, kind, slug);
    await repo.addRedirect(db, { from_path: `/${kind}/${slug}`, to_path: kind === "franchises" ? "/franchises" : "/shop", note: "Deleted" });
    await refresh([]);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

// ------------------------------------------------------------------ media
export async function uploadMediaAction(form: FormData): Promise<Result<{ item: repo.MediaItem }>> {
  try {
    const { db } = await requireAdminAction();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
    if (!/^image\/(webp|jpeg|png|avif)$/.test(file.type)) return { ok: false, error: "Upload a JPEG, PNG, WebP or AVIF image." };
    if (file.size > 8 * 1024 * 1024) return { ok: false, error: "That image is over 8MB. Resize it and try again." };
    const alt = String(form.get("alt") ?? "").trim();
    const name = slugify(String(form.get("name") ?? file.name).replace(/\.[a-z0-9]+$/i, "")) || "image";
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const now = new Date();
    const path = `${await currentStoreId()}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${name}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await db.storage.from("product-images").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (up.error) return { ok: false, error: `Upload failed: ${up.error.message}` };
    const { data } = db.storage.from("product-images").getPublicUrl(path);
    const item = await repo.insertMedia(db, {
      path, url: data.publicUrl, alt, width: Number(form.get("width")) || null, height: Number(form.get("height")) || null, bytes: file.size,
    });
    revalidatePath("/admin/media");
    return { ok: true, item };
  } catch (e) { return { ok: false, error: message(e) }; }
}
export async function updateMediaAltAction(id: string, alt: string): Promise<Result> {
  try { const { db } = await requireAdminAction(); await repo.updateMediaAlt(db, id, alt.trim()); return { ok: true }; } catch (e) { return { ok: false, error: message(e) }; }
}
export async function deleteMediaAction(id: string): Promise<Result> {
  try { const { db } = await requireAdminAction(); await repo.removeMedia(db, id); revalidatePath("/admin/media"); return { ok: true }; } catch (e) { return { ok: false, error: message(e) }; }
}

// ------------------------------------------------------------------ redirects & settings
export async function addRedirectAction(from: string, to: string, status: number, note: string): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    const f = from.trim(), t = to.trim();
    if (!f.startsWith("/")) return { ok: false, error: "The old URL must start with / (for example /products/old-name)." };
    if (!(t.startsWith("/") || /^https?:\/\//.test(t))) return { ok: false, error: "The new URL must start with / or https://." };
    if (f === t) return { ok: false, error: "The old and new URLs are the same." };
    if (![301, 302, 307, 308].includes(status)) return { ok: false, error: "Choose a redirect type." };
    await repo.addRedirect(db, { from_path: f.replace(/\/$/, "") || "/", to_path: t, status, note: note.trim() });
    await bustTag("redirects");
    revalidatePath("/admin/redirects");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
export async function deleteRedirectAction(id: number): Promise<Result> {
  try { const { db } = await requireAdminAction(); await repo.removeRedirect(db, id); await bustTag("redirects"); revalidatePath("/admin/redirects"); return { ok: true }; } catch (e) { return { ok: false, error: message(e) }; }
}
export async function saveSettingsAction(s: repo.SiteSettings): Promise<Result> {
  try {
    const { db } = await requireAdminAction();
    await repo.writeSettings(db, { ...s, sameAs: s.sameAs.map((x) => x.trim()).filter(Boolean) });
    await bustTag("settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
