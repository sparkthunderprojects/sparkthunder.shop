import type { SupabaseClient } from "@supabase/supabase-js";

/** Tables whose rows belong to one store. Everything else (stores, admin_users, gift_card_ledger) is platform-wide or reached through a scoped parent. */
const SCOPED = new Set([
  "franchises", "categories", "products", "collections", "orders", "checkout_snapshots", "discount_codes", "gift_cards",
  "reviews", "stock_alerts", "reward_points", "product_questions", "media", "redirects", "settings", "subscribers", "order_refunds", "audit_log",
]);
const WRITES = new Set(["insert", "upsert"]);

type Resolve = string | (() => Promise<string>);

/**
 * Wraps a Supabase client so every query on a store-owned table is limited to one store:
 * reads, updates and deletes get `store_id = <id>`, and inserts/upserts are stamped with it.
 * Store code therefore cannot read or change another store's data by forgetting a filter.
 * The id "*" skips scoping, for platform-wide jobs (the Stripe webhook looks an order up before it knows the store).
 */
export function scopeClient<T extends SupabaseClient>(db: T, resolve: Resolve): T {
  const getId = async () => (typeof resolve === "string" ? resolve : await resolve());
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop !== "from") {
        const v = Reflect.get(target, prop, receiver);
        return typeof v === "function" ? v.bind(target) : v;
      }
      return (table: string) => {
        if (!SCOPED.has(table)) return target.from(table);
        const calls: [string, unknown[]][] = [];
        const run = async () => {
          const id = await getId();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let q: any = target.from(table);
          const op = calls.find(([m]) => ["select", "insert", "update", "upsert", "delete"].includes(m))?.[0] ?? "select";
          for (const [m, args] of calls) {
            if (id !== "*" && WRITES.has(m)) {
              const stamp = (r: Record<string, unknown>) => ({ store_id: id, ...r });
              const rows = Array.isArray(args[0]) ? (args[0] as Record<string, unknown>[]).map(stamp) : stamp(args[0] as Record<string, unknown>);
              const opts = m === "upsert" ? { ...(args[1] as Record<string, unknown> | undefined) } : undefined;
              if (opts && typeof opts.onConflict === "string" && !opts.onConflict.split(",").map((s) => s.trim()).includes("store_id")) opts.onConflict = `store_id,${opts.onConflict}`;
              q = m === "upsert" ? q.upsert(rows, opts) : q.insert(rows, ...args.slice(1));
            } else q = q[m](...args);
          }
          if (id !== "*" && !WRITES.has(op)) q = q.eq("store_id", id);
          return q;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = new Proxy({}, {
          get(_t, m: string) {
            if (m === "then") return (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => run().then(ok, bad);
            return (...args: unknown[]) => { calls.push([m, args]); return chain; };
          },
        });
        return chain;
      };
    },
  }) as T;
}
