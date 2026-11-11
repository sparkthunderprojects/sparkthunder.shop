# Spark Merchant developer guide

Everything is per store: use the store's own address (for example `https://sparkthunder.shop`). Make keys and webhooks in **Admin > Developers**.

## API (v1)
Send `Authorization: Bearer spk_...` with every request. A key is **read** (see data), **read and change** (also mark shipped, edit price and stock) or **read, change and refund** (also send money back). Give each system the least it needs. Responses are JSON. Limit: 120 requests a minute per key (then `429` with `Retry-After`). Money is in pence.

| Method and path | Needs | What it does |
|---|---|---|
| `GET /api/v1/orders?status=&email=&limit=&before=` | read | Orders, newest first. `status`: paid, shipped, cancelled, attention. `email` finds one customer's orders. `limit` up to 100. When `has_more` is true, pass `next_before` as `before` for the next page. |
| `GET /api/v1/orders/{id or number}` | read | One order. |
| `POST /api/v1/orders/{id or number}/ship` `{"carrier":"","tracking":""}` | write | Marks it shipped, emails the customer. Sending it again does nothing. |
| `POST /api/v1/orders/{id or number}/refund` | refund | Sends money back. Needs an `Idempotency-Key` header (8 to 80 characters you make up, one per refund; repeating it never refunds twice). Body: `{"card_pence":500,"gift_pence":0,"reason":"Damaged","restock":[{"line":0,"qty":1}],"take_points":false}`. Returns `502` with `"retry": true` if the payment provider could not be reached: send the same request again. |
| `GET /api/v1/returns?status=&limit=&before=` | read | Return requests. `status`: requested, approved, rejected, received, refunded. |
| `GET /api/v1/returns/{id}` | read | One return request. |
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
