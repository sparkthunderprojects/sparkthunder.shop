import { fillForRequest } from "@/lib/site-info";

/** Renders JSON-LD in server HTML, with this store's origin and brand filled in. `<` is escaped so content can never break out of the script tag. */
export async function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(await fillForRequest(data)).replace(/</g, "\\u003c") }}
    />
  );
}
