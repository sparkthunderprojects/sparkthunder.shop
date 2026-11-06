import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CookieSettingsLink } from "@/components/CookieSettingsLink";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
  title: "Cookie Policy",
  description: "What the Sparkthunder Shop stores in your browser: no tracking cookies, only local storage that powers your basket, favourites and preferences.",
  path: "/cookies",
});
}

const items: [string, string, string][] = [
  ["sparkthunder-cart-v1", "Remembers the items in your basket", "Until you clear it"],
  ["sparkthunder-wishlist-v1", "Remembers your favourites", "Until you clear it"],
  ["sparkthunder-compare-v1", "Remembers products you are comparing", "Until you clear it"],
  ["sparkthunder-recent-v1", "Shows your recently viewed products", "Until you clear it"],
  ["sparkthunder-grid-v1", "Remembers your preferred product grid size", "Until you clear it"],
  ["sparkthunder-consent-v1", "Remembers your cookie choices", "Until you clear it"],
  ["sparkthunder-nl-popup-v1 / sparkthunder-subscribed-v1", "Stops the newsletter popup appearing again (14 days, or for good once you subscribe)", "Until you clear it"],
];

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie policy" path="/cookies" intro="The Sparkthunder Shop uses your browser to remember things you have chosen. Analytics and advertising cookies are optional and stay off unless you say yes.">
      <h2>What is stored</h2>
      <p>These items are essential to features you use, so they do not need a consent banner. They stay on your device.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left font-sans text-base">
          <thead><tr className="border-b border-ink/15"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Purpose</th><th className="py-2">Kept</th></tr></thead>
          <tbody>
            {items.map(([n, p, k]) => (
              <tr key={n} className="border-b border-ink/20 align-top"><td className="py-2.5 pr-4 font-bold">{n}</td><td className="py-2.5 pr-4">{p}</td><td className="py-2.5">{k}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Optional cookies</h2>
      <p><b>Performance cookies</b> (analytics) show us which pages and products are popular so we can improve the shop. <b>Targeting cookies</b> let us measure our adverts and show relevant Sparkthunder merchandise elsewhere. Both are off until you turn them on, and nothing optional loads before then.</p>
      <p><CookieSettingsLink className="btn btn-ink btn-sm">Change my cookie choices</CookieSettingsLink></p>

      <h2>Managing it</h2>
      <p>You can remove all of this at any time by clearing site data for sparkthunder.shop in your browser settings. Your basket and favourites will then be emptied.</p>

      <h2>If this changes</h2>
      <p>If we add new kinds of non-essential cookies, we will ask for your consent first and update this page.</p>
    </LegalPage>
  );
}
