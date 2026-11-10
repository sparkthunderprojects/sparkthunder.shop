const BASE = "https://api.printify.com/v1";

export type PfyProduct = {
  id: string; title: string; description: string; tags?: string[]; visible: boolean;
  options: { name: string; type: string; values: { id: number; title: string; colors?: string[] }[] }[];
  variants: { id: number; sku?: string; price: number; title: string; is_enabled: boolean; is_default?: boolean; is_available?: boolean; options: number[] }[];
  images: { src: string; variant_ids: number[]; position?: string; is_default?: boolean }[];
};
export type PfyAddress = { first_name: string; last_name: string; email: string; phone: string; country: string; region: string; address1: string; address2: string; city: string; zip: string };
export type PfyOrderInput = { external_id: string; label: string; line_items: { product_id: string; variant_id: number; quantity: number }[]; shipping_method: number; send_shipping_notification: boolean; address_to: PfyAddress };

/** An error from Printify. `retryable` is true for temporary problems (network, rate limit, 5xx) and false when asking again cannot help. */
export class PrintifyError extends Error {
  constructor(message: string, public status: number, public retryable: boolean) { super(message); }
}

type Fetch = typeof fetch;

/** A thin, server-only client for one store's Printify account. `fetchImpl` lets tests stand in for the network. */
export class Printify {
  constructor(private token: string, private fetchImpl: Fetch = fetch) {}

  private async call<T>(method: string, path: string, body?: unknown, tries = 3): Promise<T> {
    let last: PrintifyError | null = null;
    for (let i = 0; i < tries; i++) {
      try {
        const res = await this.fetchImpl(`${BASE}${path}`, {
          method,
          headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json;charset=utf-8", "User-Agent": "SparkMerchant/1.0" },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(20_000),
        });
        if (res.status === 429 || res.status >= 500) { last = new PrintifyError(`Printify is busy (${res.status}).`, res.status, true); await new Promise((r) => setTimeout(r, 400 * (i + 1))); continue; }
        const text = await res.text();
        if (!res.ok) {
          let msg = text.slice(0, 300);
          try { const j = JSON.parse(text); msg = j.errors?.reason ?? j.message ?? j.error ?? msg; if (typeof msg !== "string") msg = JSON.stringify(msg).slice(0, 300); } catch { /* keep the raw text */ }
          throw new PrintifyError(res.status === 401 ? "Printify rejected the token. Check it is correct and has not expired." : `Printify said ${res.status}: ${msg}`, res.status, false);
        }
        return (text ? JSON.parse(text) : {}) as T;
      } catch (e) {
        if (e instanceof PrintifyError) { if (!e.retryable) throw e; last = e; continue; }
        last = new PrintifyError(e instanceof Error ? e.message : "Could not reach Printify.", 0, true);
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
    throw last ?? new PrintifyError("Could not reach Printify.", 0, true);
  }

  shops() { return this.call<{ id: number; title: string; sales_channel: string }[]>("GET", "/shops.json"); }

  /** Every product in the shop (all pages). */
  async listProducts(shopId: string): Promise<PfyProduct[]> {
    const out: PfyProduct[] = [];
    for (let page = 1; page <= 40; page++) {
      const r = await this.call<{ data: PfyProduct[]; last_page: number }>("GET", `/shops/${encodeURIComponent(shopId)}/products.json?limit=50&page=${page}`);
      out.push(...(r.data ?? []));
      if (page >= (r.last_page ?? 1)) break;
    }
    return out;
  }

  /** Create an order. A repeat of the same external_id is rejected with 409 by Printify, which is what makes sending safe to retry. */
  createOrder(shopId: string, o: PfyOrderInput) { return this.call<{ id: string }>("POST", `/shops/${encodeURIComponent(shopId)}/orders.json`, o); }
  sendToProduction(shopId: string, orderId: string) { return this.call<{ id: string }>("POST", `/shops/${encodeURIComponent(shopId)}/orders/${encodeURIComponent(orderId)}/send_to_production.json`, {}); }
  getOrder(shopId: string, orderId: string) { return this.call<{ id: string; status: string; app_order_id?: string; shipments?: unknown[] }>("GET", `/shops/${encodeURIComponent(shopId)}/orders/${encodeURIComponent(orderId)}.json`); }
  /** Recent orders, newest first, used to find an order we created but did not get the id of. */
  listOrders(shopId: string, page = 1) { return this.call<{ data: { id: string; app_order_id?: string; external_id?: string; label?: string; status: string }[] }>("GET", `/shops/${encodeURIComponent(shopId)}/orders.json?limit=50&page=${page}`); }
  createWebhook(shopId: string, topic: string, url: string, secret: string) { return this.call<{ id: string }>("POST", `/shops/${encodeURIComponent(shopId)}/webhooks.json`, { topic, url, secret }); }
  listWebhooks(shopId: string) { return this.call<{ id: string; topic: string; url: string }[]>("GET", `/shops/${encodeURIComponent(shopId)}/webhooks.json`); }
}
