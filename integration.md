# Depot Backend — Integration Guide

Integration reference generated from the **actual implementation** (`src/`). Use this to build a frontend or client against the API. Every field, status code, and rule below is taken from the running source.

- **Base URL:** `http://localhost:4000/api`
- **Content type:** `application/json; charset=utf-8`
- **Runtime:** Node.js + Express + MongoDB (Mongoose)
- **Default port:** `4000` (`PORT` env)

> Money is expressed in the shop's currency units (not minor units/kobo). All monetary values are rounded to 2 decimals server-side.

---

## 1. Conventions

### 1.1 Response envelope

Every JSON response uses a `success` flag.

**Success**
```json
{ "success": true, "data": { } }
```
Some endpoints also return a `message` (e.g. deletes) and list endpoints return `data` as a page object (§1.4).

**Error**
```json
{
  "success": false,
  "message": "Insufficient stock for \"Coca-Cola Crate\". Available: 4, requested: 5",
  "details": [ { "field": "items.0.quantity", "message": "..." } ]
}
```
- `message` — human-readable, always present.
- `details` — optional. Present on validation (400), duplicate-key (409), and some business errors.
- `stack` — present **only when `NODE_ENV !== 'production'`**; ignore in clients.

### 1.2 Status codes

| Code | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Created |
| 400 | Bad request / validation / business rule violated (e.g. insufficient stock, underpayment) |
| 401 | Missing, invalid, or expired token; also wrong email/password on login |
| 403 | Authenticated but role not allowed (admin-only route) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email/sku/barcode, category still in use) |
| 429 | Too many login attempts (rate limit) |
| 500 | Unexpected server error |

Common 400 `message` values you can branch on:
- `"Validation failed"` — see `details[]` for per-field messages.
- `Insufficient stock for "<name>". Available: <n>, requested: <m>`
- `Amount paid (₦<paid>) is less than the total (₦<total>)`
- `Inactive product(s) cannot be sold: <names>`
- `Some products no longer exist` (with `details.missing` = array of ids)
- `Payment method "<m>" is not enabled. Enabled: <list>`
- `Discount for "<name>" exceeds line total`
- `Type "<type>" requires a positive quantityChange` / `...negative quantityChange...`

### 1.3 Authentication

- Login/register return a JWT in `data.token`.
- Send it on every authenticated request:
  ```
  Authorization: Bearer <token>
  ```
- Payload is `{ sub: <userId> }`, signed with `JWT_SECRET`, expiry `JWT_EXPIRES_IN` (default `7d`).
- On **401**, the token is missing/invalid/expired or the user is deactivated — clear the session and re-login.
- On **403**, the user lacks the required role — show a permission error (do not re-login).

Roles: `admin`, `staff`. The first registered user is always promoted to `admin`.

`POST /auth/login` is rate-limited to **20 requests / 15 min per IP** → expect **429** on abuse.

### 1.4 Pagination

List endpoints accept `page` (default `1`) and `limit` (default `20`, **max `100`**). Response `data` is:

```json
{
  "items": [ ... ],
  "pagination": { "total": 128, "page": 1, "limit": 20, "totalPages": 7 }
}
```
`totalPages` is at least `1`.

### 1.5 Date ranges

Endpoints that accept `from` / `to` (sales, reports, stock history) parse them with `new Date(...)`:
- `from` — inclusive lower bound (`createdAt >= from`).
- `to` — **inclusive of the whole day**: `createdAt <= to 23:59:59.999` (server-local timezone).
- Send ISO strings, e.g. `2026-10-01` or `2026-10-01T00:00:00.000Z`. Invalid dates are ignored (treated as absent).

### 1.6 Search

`search` on products and inventory is a **case-insensitive substring match** across `name`, `brand`, `sku`, and `barcode`. Typing part of a word works (e.g. `coca` matches "Coca-Cola"). No special escaping required — regex chars are escaped server-side.

### 1.7 Validation semantics

Request bodies/queries are validated with Zod and **replaced with the parsed value**:
- Unknown body fields are **stripped** (not persisted).
- Query numbers are coerced (`"2"` → `2`).
- On failure you get `400` + `Validation failed` with `details[]` (`field` uses dotted paths like `items.0.quantity`).

---

## 2. Auth — `/auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | public | Liveness check (outside `/auth`) |
| POST | `/auth/register` | public* | Create user (first user → admin) |
| POST | `/auth/login` | public | Login, returns JWT |
| GET | `/auth/me` | any | Current user |
| PUT | `/auth/me/password` | any | Change own password |
| GET | `/auth/users` | admin | List users |
| PUT | `/auth/users/:id` | admin | Update user name/role/active |

\* In production, close registration after bootstrap.

### `POST /auth/register`
```json
{ "name": "Ada Obi", "email": "ada@shop.com", "password": "secret123", "role": "staff" }
```
- `name` 2–80 chars, `email` valid, `password` 6–72 chars, `role` optional (`admin`\|`staff`, default `staff`).
- **201** → `data: { user, token }`.
- **409** if email exists.

### `POST /auth/login`
```json
{ "email": "ada@shop.com", "password": "secret123" }
```
- **200** → `data: { user, token }`.
- **401** `Invalid email or password` (same message for unknown email and bad password).

`user` object (never contains the password):
```json
{
  "id": "6ad0c631...", "name": "Ada Obi", "email": "ada@shop.com",
  "role": "staff", "active": true,
  "createdAt": "...", "updatedAt": "..."
}
```
> Note: `user.id` (string) is provided by `toSafeJSON`; MongoDB `_id` is not exposed on user objects.

### `PUT /auth/me/password`
```json
{ "currentPassword": "old", "newPassword": "newsecret" }
```
- **400** `Current password is incorrect` on mismatch.

### `PUT /auth/users/:id` (admin)
```json
{ "role": "admin", "active": false, "name": "New Name" }
```
All fields optional. An admin **cannot** change their own role or deactivate themselves (`400`).

---

## 3. Products — `/products`

Product fields (as returned by the API, with the `stockStatus` virtual included):

```json
{
  "_id": "6ad0c631...",
  "name": "Coca-Cola 50cl",
  "brand": "Coca-Cola",
  "category": { "_id": "6ad0...", "name": "Soft Drinks" },
  "description": "",
  "sku": "", "barcode": "", "imageUrl": "",
  "sellingUnit": "bottle",
  "price": 500, "costPrice": 400,
  "stock": 120, "minStock": 12,
  "status": "active",
  "stockStatus": "ok",
  "createdAt": "...", "updatedAt": "...", "__v": 0
}
```
- `category` is populated to `{ _id, name }`.
- `sellingUnit` ∈ `bottle, can, piece, pack, crate, carton, case, other`.
- `status` ∈ `active, inactive`.
- `stockStatus` (computed): `out_of_stock` if `stock <= 0`, else `low_stock` if `stock <= minStock`, else `ok`.

### `GET /products`
Query params (all optional):
| Param | Notes |
| --- | --- |
| `search` | substring across name/brand/sku/barcode |
| `category` | category `_id` (24-hex) |
| `status` | `active` \| `inactive` |
| `stockStatus` | `ok` \| `low_stock` \| `out_of_stock` |
| `sort` | `name`,`-name`,`price`,`-price`,`stock`,`-stock`,`createdAt`,`-createdAt` (default `name`) |
| `page`, `limit` | pagination |

Returns a page object (§1.4) of products.
> Filter nuance: `stockStatus=low_stock` matches `stock <= minStock` (this can include zero-stock items), while the per-product `stockStatus` virtual marks `stock <= 0` as `out_of_stock`.

### `GET /products/:id`
**200** product, or **404** `Product not found`. Invalid ObjectId → **400**.

### `POST /products` (admin)
```json
{
  "name": "Coca-Cola 50cl", "brand": "Coca-Cola", "category": "<categoryId>",
  "sellingUnit": "bottle", "price": 500, "costPrice": 400,
  "stock": 120, "minStock": 12, "status": "active",
  "sku": "CC-50", "barcode": "54490000", "description": "", "imageUrl": ""
}
```
- `name`, `category`, `price` required.
- Empty-string `sku`/`barcode` are dropped (not stored).
- If `minStock` omitted, it defaults to `settings.lowStockDefault`.
- **201** → product. **409** on duplicate `sku`/`barcode`.

### `PUT /products/:id` (admin)
Partial update (same fields, all optional). Sending `sku: ""` or `barcode: ""` clears them (`null`). **404** if not found.

### `DELETE /products/:id` (admin)
**200** `{ "success": true, "message": "Product deleted" }`. **404** if not found.
> Past sales keep their own price/name snapshot, so deleting a product never rewrites history.

---

## 4. Categories — `/categories`

Category shape:
```json
{ "_id": "6ad0...", "name": "Soft Drinks", "description": "", "active": true, "createdAt": "...", "updatedAt": "...", "__v": 0 }
```

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/categories` | any | optional `search` (name substring), `active=true\|false` |
| GET | `/categories/:id` | any | **404** if not found |
| POST | `/categories` | admin | `{ name, description?, active? }` |
| PUT | `/categories/:id` | admin | partial update |
| DELETE | `/categories/:id` | admin | see below |

`POST`/`PUT`: `name` 1–80 chars (unique → **409** on duplicate).

`DELETE` returns **409** while products still reference the category:
```json
{ "success": false, "message": "Cannot delete: 3 product(s) still use this category", "details": { "productCount": 3 } }
```
On success: `{ "success": true, "message": "Category deleted" }`.

---

## 5. Inventory — `/inventory`

### `GET /inventory`
Product stock list. Query: `search`, `category`, `stockStatus` (`ok`\|`low_stock`\|`out_of_stock`), `page`, `limit`. Items are products sorted by `stock` then `name` (same shape as §3).

### `POST /inventory/adjust`
```json
{ "product": "<productId>", "type": "received", "quantityChange": 24, "reason": "Restock from supplier" }
```
- `quantityChange` — **non-zero integer** (sign matters).
- `type` and allowed sign:
  | type | sign required |
  | --- | --- |
  | `received` | positive |
  | `return` | positive |
  | `damaged` | negative |
  | `expired` | negative |
  | `adjustment` | either |
  | `correction` | either |
  | `sale` | negative |
- **201** →
  ```json
  {
    "success": true,
    "data": {
      "transaction": {
        "_id": "...", "product": "...", "type": "received",
        "previousQuantity": 200, "quantityChange": 24, "newQuantity": 224,
        "reason": "Restock from supplier", "user": "<userId>",
        "createdAt": "...", "updatedAt": "...", "__v": 0
      },
      "newQuantity": 224
    }
  }
  ```
- Errors: **400** sign mismatch; **400** `Insufficient stock...` if a negative change would drop stock below 0 (atomic, stock never goes negative); **404** `Product not found`.

### `GET /inventory/transactions`
Stock history. Query: `product`, `type`, `from`, `to`, `page`, `limit`. Sorted newest-first. Each item populates `product` → `{ name, brand, sellingUnit }` and `user` → `{ name }`.

> `type: "sale"` transactions are written automatically when a sale completes; you don't create them manually.

---

## 6. Sales (POS) — `/sales`

### `POST /sales` — complete a sale
```json
{
  "items": [
    { "product": "<productId>", "quantity": 3, "discount": 0 },
    { "product": "<productId2>", "quantity": 1, "discount": 100 }
  ],
  "discount": 0,
  "amountPaid": 15000,
  "paymentMethod": "cash",
  "customer": { "name": "Walk-in", "phone": "0803..." },
  "note": ""
}
```
- `items`: 1–200 lines; `quantity` integer `1..100000`; per-line `discount` ≥ 0.
- `discount` — optional sale-level discount ≥ 0.
- `amountPaid` ≥ 0 (required).
- `paymentMethod` optional — falls back to `settings.defaultPaymentMethod`. Must be in `settings.paymentMethods`, else **400**.
- `customer` / `note` optional.

**Pricing is always taken from the live product `price`** (the client does not send prices). Per line: `subtotal = round2(unitPrice × quantity − lineDiscount)`. Sale: `subtotal = Σ lineSubtotal`, `total = max(0, subtotal − discount)`, `change = round2(amountPaid − total)`.

**201** → the full saved sale:
```json
{
  "success": true,
  "data": {
    "_id": "6ad0c724...",
    "invoiceNumber": "INV-000003",
    "items": [
      {
        "product": "<productId>",
        "name": "Coca-Cola 50cl", "brand": "Coca-Cola", "sku": "",
        "sellingUnit": "bottle",
        "unitPrice": 500, "costPrice": 400,
        "quantity": 3, "discount": 0, "subtotal": 1500
      }
    ],
    "subtotal": 1500, "discount": 0, "total": 1500,
    "amountPaid": 2000, "change": 500,
    "paymentMethod": "cash",
    "customer": { "name": "Walk-in", "phone": "0803..." },
    "note": "",
    "staff": "<userId>",
    "createdAt": "...", "updatedAt": "...", "__v": 0
  }
}
```
> `items[].product` is an id (not populated). `costPrice` is stored for profit reporting — keep it server-side only in the UI if you wish.

**Guarantees (safe to rely on):**
1. **Atomic stock reservation** per line — concurrent sales cannot oversell; the losing request gets **400** `Insufficient stock...`.
2. **Invoice numbers never duplicate** (atomic counter, format `<invoicePrefix>-000001`). Concurrent requests get distinct numbers.
3. **All-or-nothing**: if any line fails, previously reserved stock is restocked — a failed sale never leaves stock reduced.
4. Prices/units/names are **snapshotted** at sale time.

Errors (all **400** unless noted): inactive product, missing product (`details.missing`), insufficient stock, line discount > line total, underpayment, payment method not enabled, or schema validation.

### `GET /sales`
History. Query: `search` (matches `invoiceNumber`, `customer.phone`, `customer.name` — case-insensitive substring), `paymentMethod`, `from`, `to`, `page`, `limit`. Sorted newest-first; `staff` populated to `{ name }`.

### `GET /sales/:id`
Full sale (staff populated). **404** `Sale not found` if unknown id.

### `GET /sales/invoice/:invoiceNumber`
Lookup by invoice number. The value is **uppercased** before lookup, so `inv-000001` works. **404** if not found.

---

## 7. Dashboard — `/dashboard`

`GET /dashboard` (any role) returns one aggregate object:

```json
{
  "success": true,
  "data": {
    "today": { "sales": 13250, "transactions": 3, "estimatedProfit": 1700 },
    "products": { "total": 8, "lowStock": 0, "outOfStock": 0 },
    "inventoryValue": 462300,
    "recentSales": [ /* up to 8 latest sales, staff populated */ ],
    "bestSellers": [ { "_id": "<productId>", "name": "...", "quantity": 9, "revenue": 4500 } ],
    "paymentSummary": [ { "_id": "cash", "total": 13250, "count": 3 } ],
    "salesTrend": [ { "_id": "2026-10-15", "sales": 13250, "transactions": 3 } ]
  }
}
```
- `today.estimatedProfit` is `null` when there are no sales today, otherwise `revenue − cost` (cost from `costPrice × qty`).
- `bestSellers` — top 5 by quantity.
- `salesTrend` — last 30 days, one bucket per day (`_id` is `YYYY-MM-DD`).

---

## 8. Reports — `/reports`

All accept optional `from` / `to` (§1.5). Any role.

| Path | Returns |
| --- | --- |
| `GET /reports/sales` | `{ from, to, revenue, estimatedCost, estimatedProfit, transactions, averageSale }` |
| `GET /reports/sales/daily` | `[ { date: "YYYY-MM-DD", revenue, estimatedProfit, transactions } ]` (ascending) |
| `GET /reports/products/best-selling` | `[ { _id, name, quantity, revenue, transactions } ]` |
| `GET /reports/products/slow-moving` | `[ { product, name, stock, soldInPeriod } ]` |
| `GET /reports/payments` | `[ { _id: "<method>", total, count, changeGiven } ]` |
| `GET /reports/inventory` | `{ summary: { products, unitsInStock, costValue, retailValue }, lowStock: [...], outOfStock: [...] }` |

Notes:
- `estimatedProfit` is `null` when revenue is 0 (`/reports/sales`).
- `best-selling`: optional `limit` (≤ 50, default 10).
- `slow-moving`: optional `days` (≤ 365, default 30) and `limit` (≤ 50, default 20); sorted by fewest sold.

---

## 9. Settings — `/settings`

Settings shape:
```json
{
  "_id": "...", "key": "global",
  "shopName": "My Beverage Depot", "logoUrl": "", "address": "", "phone": "", "email": "",
  "currency": "NGN", "currencySymbol": "₦",
  "invoicePrefix": "INV",
  "defaultPaymentMethod": "cash",
  "paymentMethods": ["cash", "bank_transfer", "pos", "other"],
  "receiptFooter": "Thank you for your purchase!",
  "lowStockDefault": 5, "taxPercent": 0,
  "createdAt": "...", "updatedAt": "..."
}
```

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/settings` | any | Returns the settings doc (auto-creates defaults if missing) |
| PUT | `/settings` | admin | Partial update, returns updated doc |

`PUT` accepts any subset of: `shopName`, `logoUrl`, `address`, `phone`, `email`, `currency`, `currencySymbol`, `invoicePrefix` (alphanumeric/`_`/`-`, 1–12), `defaultPaymentMethod`, `paymentMethods` (≥ 1), `receiptFooter`, `lowStockDefault`, `taxPercent` (0–100).

> Changing `invoicePrefix` only affects **new** invoices (counter is keyed per prefix). Existing invoice numbers are unchanged.

---

## 10. Backup — `/backup` (admin only)

### `GET /backup/export`
Returns a JSON **file download** (`Content-Disposition: attachment; filename=depot-backup-YYYY-MM-DD.json`). Payload:
```json
{
  "success": true,
  "data": {
    "app": "depot-backend", "version": 1, "exportedAt": "2026-10-15T12:00:00.000Z",
    "categories": [ ... ], "products": [ ... ], "sales": [ ... ],
    "inventoryTransactions": [ ... ], "settings": { ... }
  }
}
```
Save `data` to a file to restore later (you must POST the same `data` object back, not the outer envelope).

### `POST /backup/restore`
Body: `{ "data": { ...same shape as export's data... } }`.
- Validates `data.app === "depot-backend"` and `data.version === 1`, else **400** `Unrecognized or unsupported backup file`.
- **Replaces** all categories, products, sales, and stock history. This is destructive — confirm in the UI first.
- Returns counts:
  ```json
  { "success": true, "message": "Backup restored", "data": { "categories": 6, "products": 8, "sales": 3, "inventoryTransactions": 10 } }
  ```
- Uses a MongoDB transaction when the server supports it; on a standalone `mongod` it falls back to a sequential restore and `message` notes `(sequential mode ...)`.

---

## 11. Health

`GET /api/health` (public):
```json
{ "success": true, "status": "ok", "time": "2026-10-15T12:00:00.000Z" }
```
Use this for connectivity checks and readiness.

---

## 12. Client integration checklist

1. **Bootstrap:** `POST /auth/login` → store `token` (and `user`). Attach `Authorization: Bearer <token>` to every call.
2. **Route guards:** use `user.role === 'admin'` to show admin-only actions (create/edit/delete products & categories, settings, backup, user management). The API enforces these server-side regardless.
3. **POS flow:** load products via `GET /products?status=active&search=...` → build `items[]` with only `product` + `quantity` (+ optional line `discount`) → `POST /sales`. Prices are computed server-side. Render the returned sale as the receipt (`invoiceNumber`, items, `total`, `amountPaid`, `change`, plus `settings.receiptFooter`).
4. **Do not trust the client for stock or totals.** Handle `400` insufficient-stock by refreshing the product list and letting staff adjust quantity.
5. **Reconcile on failure:** any non-2xx from `POST /sales` means no sale was recorded and no stock was consumed — safe to simply fix input and retry.
6. **Pagination:** drive tables from `data.items` + `data.pagination`; default `limit` 20, cap 100.
7. **Search:** debounce `search` and hit `GET /products` / `GET /inventory` — matching is substring-based, no wildcards needed.
8. **Dates:** send `from`/`to` as ISO; remember `to` includes the entire day server-local.
9. **401 handling:** on token expiry, redirect to login. 403 ≠ expired token.
10. **IDs:** all `_id` values are 24-char hex strings; sending a malformed id to a `:id` route yields `400`.

---

## 13. Quick cURL reference

```bash
BASE=http://localhost:4000/api

# login
TOKEN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@depot.local","password":"Passw0rd!"}' | jq -r .data.token)
AUTH="Authorization: Bearer $TOKEN"

# search products
curl -s "$BASE/products?search=coca&limit=5" -H "$AUTH"

# complete a sale
curl -s $BASE/sales -H "$AUTH" -H 'Content-Type: application/json' -d '{
  "items":[{"product":"<productId>","quantity":2}],
  "amountPaid":1000,"paymentMethod":"cash"
}'

# receive stock
curl -s $BASE/inventory/adjust -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"product":"<productId>","type":"received","quantityChange":24,"reason":"Delivery"}'

# dashboard / report
curl -s $BASE/dashboard -H "$AUTH"
curl -s "$BASE/reports/sales?from=2026-10-01&to=2026-10-15" -H "$AUTH"
```
