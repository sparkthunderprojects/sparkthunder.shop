import { requireAdmin } from "@/lib/admin/auth";
import type { ApiKeyRow } from "@/lib/api/keys";
import { EVENTS } from "@/lib/webhooks/outbound";
import { DeveloperPanel, type Delivery, type Endpoint } from "./DeveloperPanel";

export const metadata = { title: "Developers" };

export default async function DevelopersAdmin() {
  const { db } = await requireAdmin("settings");
  const [keys, eps, dels] = await Promise.all([
    db.from("api_keys").select("id,name,prefix,scopes,created_by,created_at,last_used_at,revoked_at").order("created_at", { ascending: false }),
    db.from("webhook_endpoints").select("id,url,events,active,created_at").order("created_at", { ascending: false }),
    db.from("webhook_deliveries").select("id,endpoint_id,event,status,attempts,last_status,last_error,created_at").order("created_at", { ascending: false }).limit(25),
  ]);
  return (
    <>
      <div className="adm-h"><div><h1>Developers</h1><p>Connect other systems: API keys to read orders and products, and webhooks that tell your own server when something happens.</p></div></div>
      <DeveloperPanel keys={(keys.data ?? []) as ApiKeyRow[]} endpoints={(eps.data ?? []) as Endpoint[]} deliveries={(dels.data ?? []) as Delivery[]} events={[...EVENTS]} />
    </>
  );
}
