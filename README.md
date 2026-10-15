# Depot Backend

Node.js + Express + MongoDB backend API for the Offline Beverage Shop POS & Inventory Management system.

## Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express 4
- **Database:** MongoDB (Mongoose 8)
- **Auth:** JWT + bcryptjs, roles (`admin`, `staff`)
- **Validation:** Zod

## Quick start

```bash
cp .env.example .env        # then edit JWT_SECRET / ADMIN_PASSWORD
npm install
npm run seed -- --products  # admin user, settings, categories, sample products
npm run dev                 # http://localhost:4000
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start with auto-reload (`node --watch`) |
| `npm start` | Start production server |
| `npm run seed` | Seed admin, settings, categories (add `-- --products` for samples) |

## API overview

All routes are under `/api`. All except `/api/health`, `/api/auth/register`, `/api/auth/login` require `Authorization: Bearer <token>`.

### Auth
| Method | Route | Role | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | —* | Register (first user always becomes admin) |
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/auth/me` | any | Current user |
| PUT | `/auth/me/password` | any | Change own password |
| GET | `/auth/users` | admin | List users |
| PUT | `/auth/users/:id` | admin | Update user role/active/name |

\* rate-limited; in production consider closing registration after bootstrap.

### Categories
| Method | Route | Role |
| --- | --- | --- |
| GET | `/categories` | any |
| GET | `/categories/:id` | any |
| POST | `/categories` | admin |
| PUT | `/categories/:id` | admin |
| DELETE | `/categories/:id` | admin (blocked while products use it) |

### Products
| Method | Route | Role |
| --- | --- | --- |
| GET | `/products?search=&category=&status=&stockStatus=&sort=&page=&limit=` | any |
| GET | `/products/:id` | any |
| POST | `/products` | admin |
| PUT | `/products/:id` | admin |
| DELETE | `/products/:id` | admin |

Fields: `name, brand, category, description, sku, barcode, imageUrl, sellingUnit (bottle|can|piece|pack|crate|carton|case|other), price, costPrice, stock, minStock, status`.

### Inventory
| Method | Route | Description |
| --- | --- | --- |
| GET | `/inventory` | Stock list with `stockStatus=ok\|low_stock\|out_of_stock` filter |
| POST | `/inventory/adjust` | Record stock movement (atomic, never goes negative) |
| GET | `/inventory/transactions` | Stock history (`product`, `type`, `from`, `to`) |

Adjust body: `{ "product": "<id>", "type": "received", "quantityChange": 24, "reason": "Restock from supplier" }`

Types: `received (+)`, `return (+)`, `damaged (-)`, `expired (-)`, `adjustment (±)`, `correction (±)`. `sale` is written automatically.

### Sales (POS)
| Method | Route | Description |
| --- | --- | --- |
| POST | `/sales` | Complete a sale |
| GET | `/sales?search=&paymentMethod=&from=&to=` | Sales history |
| GET | `/sales/:id` | Sale detail |
| GET | `/sales/invoice/:invoiceNumber` | Lookup by invoice no. |

Create sale body:

```json
{
  "items": [
    { "product": "<id>", "quantity": 5, "discount": 0 },
    { "product": "<id>", "quantity": 1, "discount": 50 }
  ],
  "discount": 0,
  "amountPaid": 10000,
  "paymentMethod": "cash",
  "customer": { "name": "Walk-in", "phone": "" },
  "note": ""
}
```

Guarantees:
- Stock is **atomically reserved per line** (no overselling, even under concurrency).
- Invoice numbers come from an atomic counter (`INV-000001`) — never duplicated.
- If any step fails, reserved stock is automatically restocked.
- `amountPaid < total` is rejected; `change` is computed server-side.
- Product prices are snapshotted on the sale (later price edits never alter history).

### Dashboard & Reports
| Method | Route | Description |
| --- | --- | --- |
| GET | `/dashboard` | Today's sales/profit/transactions, stock alerts, best sellers, trend |
| GET | `/reports/sales?from=&to=` | Revenue, cost, profit, avg sale |
| GET | `/reports/sales/daily?from=&to=` | Daily breakdown |
| GET | `/reports/products/best-selling?limit=` | Best sellers |
| GET | `/reports/products/slow-moving?days=` | Slow movers |
| GET | `/reports/payments?from=&to=` | Totals by payment method |
| GET | `/reports/inventory` | Stock value, low/out-of-stock lists |

### Settings & Backup
| Method | Route | Role | Description |
| --- | --- | --- | --- |
| GET | `/settings` | any | Shop profile, currency, invoice prefix, receipt footer |
| PUT | `/settings` | admin | Update settings |
| GET | `/backup/export` | admin | Download full JSON backup |
| POST | `/backup/restore` | admin | Restore from a backup file |

## Data integrity notes

- Stock decrements use single-document atomic `findOneAndUpdate` with a `stock >= qty` guard, so this API works on **standalone MongoDB** without replica-set transactions.
- Restore uses a transaction when available and automatically falls back to sequential restore on standalone instances.
- Monetary values are rounded to 2 decimals server-side.

## Response format

Success: `{ "success": true, "data": ... }`
Error: `{ "success": false, "message": "...", "details": [...] }`
