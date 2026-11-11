import type { MetadataRoute } from "next";
import { getStore } from "@/lib/store";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const store = await getStore();
  return {
    name: store.name,
    short_name: store.name.slice(0, 12),
    description: store.description,
    start_url: "/",
    display: "standalone",
    background_color: store.light,
    theme_color: store.dark,
    icons: [{ src: store.logoUrl || "/logo", sizes: "512x512", type: "image/png" }],
  };
}
