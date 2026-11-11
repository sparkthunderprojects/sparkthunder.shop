# Spark Merchant developer guide

Everything is per store: use the store's own address (for example `https://sparkthunder.shop`). Make keys and webhooks in **Admin > Developers**.

## API (v1)
Send `Authorization: Bearer spk_...` with every request. Responses are JSON. Limit: 120 requests a minute per key (then `429` with `Retry-After`). Money is in pence.

| Method and path | Needs | What it does |
|---|---|---|
| `GET /api/v1/orders?status=&limit=&before=` | read | Orders, newest first. `status`: paid, shipped, cancelled, attention. `limit` up to 100. When `has_more` is true, pass `next_before` as `before` for the next page. |
| `GET /api/v1/orders/{id or number}` | read | One order. |
| `POST /api/v1/orders/{id or number}/ship` `{"carrier":"","tracking":""}` | write | Marks it shipped, emails the customer. Sending it again does nothing. |
| `GET /api/v1/products?limit=&before=` | read | Products (including unpublished). |
| `GET /api/v1/products/{slug}` | read | One product. |
| `PATCH /api/v1/products/{slug}` | write | Change only `price_pence`, `stock_qty`, `in_stock`, `published`. Anything else is refused. |

Errors look like `{"error":"..."}` with 400, 401 (bad key), 403 (key lacks permission), 404, 409, 429 or 5xx.
Orders never include card or internal fields.

## Webhooks
We `POST` JSON `{ "id", "event", "created_at", "data" }` to your https address. Events: `order.created`, `order.shipped`, `order.refunded`, `return.requested`. Headers: `X-Spark-Event`, `X-Spark-Delivery` (unique id: use it to ignore repeats), `X-Spark-Signature`.

Check the signature before trusting a request: `sha256=` + HMAC-SHA256 of the raw body, keyed with the webhook's signing secret (shown once when you add it).

```js
const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers["x-spark-signature"]));
```

Answer with any `2xx` within 8 seconds. Otherwise we try again (about 1 min, 5 min, 30 min, 2 h, 12 h later) and then show it as failed in Admin > Developers, where you can retry it. Retries run when the scheduled job runs (see the scheduled-emails notes in RUNBOOK.md), so they need `CRON_SECRET` set up. Redirects are not followed; addresses that point at private networks are refused.
