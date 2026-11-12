import { requireAdmin } from "@/lib/admin/auth";
import { getAllProducts, getFranchises } from "@/lib/catalog";
import { mergeCharacters, normaliseCharacters } from "@/lib/character-config";
import { listMedia } from "@/lib/admin/repo";
import { CharacterManager } from "./CharacterManager";

export const metadata = { title: "Characters" };

export default async function CharactersAdminPage() {
  const { db } = await requireAdmin("catalogue");
  const [{ data }, products, franchises, media] = await Promise.all([db.from("settings").select("value").eq("key", "characters").maybeSingle(), getAllProducts(), getFranchises(), listMedia(db)]);
  const profiles = normaliseCharacters((data as { value?: unknown } | null)?.value);
  const entries = mergeCharacters(profiles, products);
  return <CharacterManager initial={entries} franchises={franchises.map((f) => ({ slug: f.slug, name: f.name }))} media={media} />;
}
