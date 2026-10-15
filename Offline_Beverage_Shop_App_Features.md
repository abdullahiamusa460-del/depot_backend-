# Offline Beverage Shop POS & Inventory Management Application

## 1. Project Overview

A modern, offline-first beverage shop management application designed for use inside a physical shop.

The application is **not a customer-facing e-commerce website** and does not require customer accounts.

Its primary purpose is to help shop staff:

- Store and manage beverage products
- Track inventory
- Sell products quickly
- Calculate totals
- Record payments
- Generate invoices/receipts
- Track sales history
- Monitor stock
- Generate useful business reports
- Continue operating when there is no internet connection

### Core workflow

```text
Customer arrives
      ↓
Search/select products
      ↓
Add products to current sale
      ↓
Enter quantities
      ↓
Calculate total
      ↓
Record payment
      ↓
Generate invoice/receipt
      ↓
Complete sale
      ↓
Automatically reduce inventory
      ↓
Save transaction locally
```

---

# 2. Main Goals

The application should be:

- Offline-first
- Fast
- Reliable
- Modern
- Easy to use
- Responsive
- Customizable
- Maintainable
- Safe against accidental data loss
- Suitable for daily shop operations

The design should feel like a modern application rather than an old-fashioned POS system.

---

# 3. Important Requirements

## 3.1 Offline Operation

Core business operations must work without internet access.

The application must allow the shop to:

- View products
- Search products
- Add products to a sale
- Calculate prices
- Complete sales
- Update inventory
- Generate receipts
- View sales history
- Manage products
- Manage categories
- View reports
- Adjust stock

without requiring a server or internet connection.

## 3.2 Local Data Storage

Business data should be stored locally using a proper browser/device database.

Recommended approach:

- IndexedDB
- A suitable IndexedDB abstraction such as Dexie, if appropriate

Data should remain available after:

- Refreshing the application
- Closing the application
- Restarting the computer

Do not depend on `localStorage` for the main transactional database if a proper local database is available.

---

# 4. Application Users

This is an internal shop application.

## Customer Accounts

Customer accounts are **not required**.

Do not build:

- Customer registration
- Customer login
- Customer passwords
- Customer dashboards
- Customer wishlists
- Customer online shopping profiles

Customer information on an invoice should be optional.

## Staff/Admin Access

The application may support shop staff/admin access later.

Possible roles:

- Administrator
- Shop staff

Permissions can be added later if required.

---

# 5. Main Application Modules

The application should contain the following major modules:

1. Dashboard
2. Point of Sale (POS)
3. Products
4. Categories
5. Inventory
6. Sales
7. Invoices/Receipts
8. Reports
9. Settings
10. Backup & Restore
11. Theme/Appearance
12. Optional future synchronization

---

# 6. Dashboard

The dashboard provides a quick overview of the shop.

## Dashboard statistics

Display:

- Today's sales
- Today's transaction count
- Total products
- Low-stock products
- Out-of-stock products
- Today's profit, when cost prices are available
- Total inventory value, when applicable

## Dashboard sections

Include:

- Recent sales
- Best-selling products
- Low-stock products
- Sales trend
- Payment-method summary
- Inventory status

The dashboard should remain simple enough to understand at a glance.

---

# 7. Point of Sale (POS)

The POS is the most important operational screen.

It should be optimized for fast selling.

## Product search

Search by:

- Product name
- Brand
- SKU
- Barcode, if barcode support is enabled

Search should feel immediate.

## Product selection

Show:

- Product name
- Product image
- Selling unit
- Price
- Available stock
- Product status

## Current sale

Display:

- Product
- Quantity
- Unit price
- Discount
- Subtotal

## Sale controls

Provide:

- Add item
- Increase quantity
- Decrease quantity
- Remove item
- Clear sale
- Hold/resume sale if implemented
- Product search
- Category shortcuts
- Frequently sold products

## Stock validation

The POS must prevent selling more stock than is available.

Example:

```text
Available: 10
Customer requests: 12

Result:
Sale cannot be completed until quantity is corrected.
```

---

# 8. Product Management

The product module manages all beverages sold by the shop.

## Product fields

A product can contain:

- Product ID
- Product name
- Brand
- Category
- Description
- SKU
- Barcode
- Product image
- Selling unit
- Selling price
- Cost price
- Stock quantity
- Minimum stock level
- Status
- Created date
- Updated date

## Product actions

The user should be able to:

- Add product
- Edit product
- Delete product
- Activate/deactivate product
- Search products
- Filter products
- Sort products
- Change price
- Change stock
- Upload/change image

Products should not be hard-coded.

---

# 9. Beverage Categories

The system should support configurable categories.

Examples:

- Soft Drinks
- Water
- Malt
- Juice
- Energy Drinks
- Other Beverages

Category management should support:

- Add category
- Edit category
- Delete category
- Assign products to categories
- Search categories

---

# 10. Selling Units

Beverages may have different selling units.

Supported examples:

- Bottle
- Can
- Piece
- Pack
- Crate
- Carton
- Case

The system must not assume every beverage uses the same unit.

Example:

```text
Coca-Cola 50cl
Bottle: ₦500

Coca-Cola Crate
Crate: ₦12,000
```

The architecture should allow different products and packaging structures.

---

# 11. Inventory Management

Inventory tracks the quantity of goods available.

## Inventory information

Display:

- Product
- Current stock
- Reserved stock, if implemented
- Available stock
- Minimum stock
- Stock status
- Last stock update

## Inventory actions

Allow:

- Receive stock
- Increase stock
- Reduce stock
- Adjust stock
- Record damaged goods
- Record expired goods
- Record lost goods
- Correct inventory errors

Every important stock adjustment should be recorded.

---

# 12. Automatic Inventory Reduction

When a sale is successfully completed:

```text
Current stock - Quantity sold = New stock
```

Example:

```text
Coca-Cola stock: 100
Sold: 5
New stock: 95
```

The inventory update and sale record should be handled consistently so that an incomplete sale does not incorrectly reduce stock.

---

# 13. Low-Stock Management

Each product can have a minimum stock threshold.

Example:

```text
Current stock: 5
Minimum stock: 10

Status: LOW STOCK
```

When stock reaches zero:

```text
Status: OUT OF STOCK
```

Low-stock products should be visible on:

- Dashboard
- Inventory page
- Product list
- Relevant POS indicators

---

# 14. Stock History

Record inventory changes.

Each inventory transaction can contain:

- Transaction ID
- Product
- Previous quantity
- Quantity changed
- New quantity
- Transaction type
- Reason
- Date
- Time
- User/staff member, if authentication is enabled

Possible transaction types:

- Stock received
- Sale
- Return
- Damaged
- Expired
- Manual adjustment
- Correction

---

# 15. Payments

The application should record how each sale was paid.

Possible methods:

- Cash
- Bank transfer
- POS
- Other

Payment methods should be configurable.

## Payment calculation

Example:

```text
Total: ₦5,000
Amount paid: ₦10,000
Change: ₦5,000
```

The application should calculate change automatically.

It should prevent completion when the payment amount is invalid.

---

# 16. Sales

Every completed sale becomes a permanent transaction record.

A sale should contain:

- Sale ID
- Invoice number
- Date
- Time
- Items
- Quantities
- Unit prices
- Discounts
- Subtotal
- Total
- Amount paid
- Change
- Payment method
- Optional customer information

---

# 17. Sales History

Provide a dedicated sales history screen.

Users should be able to:

- View previous sales
- Search sales
- Filter by date
- Filter by payment method
- Search by invoice number
- Open sale details
- Reprint/review receipt where supported

---

# 18. Invoice & Receipt System

Generate a professional receipt after completing a sale.

## Receipt contents

Include:

- Shop name
- Shop logo
- Address
- Phone number
- Invoice/receipt number
- Date
- Time
- Product names
- Quantities
- Units
- Unit prices
- Subtotal
- Discounts
- Total
- Amount paid
- Change
- Payment method
- Receipt footer

## Receipt actions

Support:

- Preview
- Print
- Save/export where appropriate
- Reprint/review previous receipt

Receipt layout should be customizable.

---

# 19. Invoice Numbering

Use a reliable offline invoice numbering system.

Example:

```text
INV-000001
INV-000002
INV-000003
```

The system must prevent duplicate invoice numbers on the same device/database.

The invoice prefix should be configurable.

---

# 20. Reports & Analytics

Provide useful business reports.

## Sales reports

Include:

- Daily sales
- Weekly sales
- Monthly sales
- Custom date-range sales
- Number of transactions
- Average transaction value

## Product reports

Include:

- Best-selling products
- Slow-moving products
- Product sales quantity
- Product sales value

## Inventory reports

Include:

- Current inventory
- Low-stock products
- Out-of-stock products
- Inventory movement
- Stock adjustments

## Payment reports

Show sales grouped by:

- Cash
- Bank transfer
- POS
- Other

Reports should work offline using locally stored data.

---

# 21. Profit Tracking

If cost price is stored, calculate estimated profit.

Example:

```text
Selling price: ₦500
Cost price: ₦400
Quantity: 10

Revenue: ₦5,000
Estimated cost: ₦4,000
Estimated profit: ₦1,000
```

Clearly distinguish:

- Revenue
- Cost
- Estimated profit

Do not claim profit accuracy if costs or other business expenses are not recorded.

---

# 22. Dashboard Analytics

Useful visualizations can include:

- Sales over time
- Top-selling products
- Sales by payment method
- Inventory status
- Profit trend when available

Charts must remain readable and useful.

Avoid unnecessary visual complexity.

---

# 23. Business Settings

Create a settings module.

## Shop information

Allow configuration of:

- Shop name
- Logo
- Address
- Phone
- Email
- Website/social links if needed

## Sales settings

Allow configuration of:

- Currency
- Invoice prefix
- Default payment method
- Tax settings if needed
- Receipt footer
- Low-stock default

## Appearance

Allow configuration of:

- Light/dark mode
- Theme colors
- Logo
- UI preferences

---

# 24. Customizable Design System

The application should be highly designable.

Create centralized design tokens for:

- Primary color
- Secondary color
- Background
- Surface
- Text
- Border
- Typography
- Spacing
- Border radius
- Shadows

Use reusable components.

Changing the main theme should not require editing dozens of files.

---

# 25. Modern UI/UX

The interface should feel like a modern application.

Use:

- Clean navigation
- Modern cards
- Professional tables
- Good typography
- Clear buttons
- Modern forms
- Useful icons
- Toast notifications
- Confirmation dialogs
- Smooth transitions
- Appropriate hover states
- Loading states
- Skeleton screens
- Empty states
- Error states

Animations should be subtle and should never slow down the POS.

---

# 26. Light & Dark Mode

Support:

- Light mode
- Dark mode
- System preference, where appropriate

Remember the user's selection locally.

---

# 27. Responsive Design

The main target is a shop laptop/desktop.

The application should also work on:

- Desktop
- Laptop
- Tablet

The POS should remain practical on smaller screens.

---

# 28. Backup & Restore

Because the application is offline-first, backup is critical.

## Backup

Allow export of:

- Products
- Categories
- Inventory
- Sales
- Stock history
- Settings

## Restore

Allow importing a previous backup.

The restore system must:

- Validate the file
- Detect invalid data
- Warn before replacing data
- Avoid silent data loss

---

# 29. Data Integrity

Important business operations must be reliable.

A completed sale should consistently:

1. Validate the product.
2. Validate available stock.
3. Validate quantity.
4. Calculate totals.
5. Validate payment.
6. Create the sale.
7. Create sale items.
8. Update inventory.
9. Generate invoice number.
10. Save the transaction.

If an operation fails, avoid leaving the database in an inconsistent state.

---

# 30. Error Handling

Handle:

- Product not found
- Insufficient stock
- Invalid quantity
- Invalid price
- Empty sale
- Invalid payment
- Database errors
- Backup errors
- Restore errors
- Missing product images
- Unexpected application errors

Use simple messages that shop staff can understand.

---

# 31. Offline Database Structure

Suggested entities:

```text
Product
Category
Inventory
InventoryTransaction
Sale
SaleItem
Payment
Settings
BusinessProfile
```

Possible future entities:

```text
Staff
User
Supplier
Purchase
PurchaseItem
Expense
Return
SyncQueue
```

The architecture should allow these to be added later.

---

# 32. Future Supplier Management

This is optional for a later version.

Potential features:

- Supplier records
- Supplier contact information
- Purchase orders
- Goods received
- Supplier purchase history
- Supplier balances

Do not implement this unless requested in the current phase.

---

# 33. Future Expense Management

Possible future feature:

- Shop expenses
- Expense categories
- Daily expenses
- Monthly expenses
- Expense reports
- Profit after expenses

Keep this separate from product sales.

---

# 34. Future Barcode Support

The application should be designed so barcode support can be added later.

Potential workflow:

```text
Scan barcode
     ↓
Find product
     ↓
Add product to POS
     ↓
Enter quantity
     ↓
Complete sale
```

Do not require barcode hardware for the first version unless explicitly requested.

---

# 35. Future Cloud Synchronization

The first version should remain offline-first.

A future version may support:

```text
Local Device
     ↓
Local Database
     ↓
Sync Engine
     ↓
Cloud Database
```

Potential future benefits:

- Multiple shop devices
- Cloud backup
- Remote reports
- Data synchronization
- Multi-branch support

This should not make the current application dependent on the internet.

---

# 36. Security

Security features may include:

- Staff/admin authentication
- PIN protection
- Role-based permissions
- Secure credential storage
- Protected settings
- Protected data export/restore

Do not store passwords in plain text.

---

# 37. Keyboard & POS Productivity

Because this is a shop POS, productivity is important.

Consider keyboard shortcuts such as:

```text
Ctrl/Cmd + K → Search products
Esc → Close dialog
Delete → Remove selected item
+ / - → Change quantity
Enter → Confirm action
```

Only implement shortcuts that do not conflict with normal browser behavior.

---

# 38. Accessibility

Follow good accessibility practices.

Include:

- Semantic HTML
- Keyboard navigation
- Proper labels
- Visible focus states
- Accessible dialogs
- Accessible buttons
- Appropriate contrast
- Screen-reader-friendly controls

---

# 39. Performance

The application should remain fast as the number of products and sales grows.

Use:

- Indexed local queries
- Efficient state management
- Appropriate indexing
- Pagination where useful
- Debounced search
- Lazy loading where useful
- Optimized images

Do not over-engineer the application.

---

# 40. Recommended Application Navigation

A possible navigation structure:

```text
Dashboard
│
├── POS
│
├── Products
│
├── Categories
│
├── Inventory
│
├── Sales
│
├── Reports
│
├── Settings
│
└── Backup & Restore
```

The navigation can be adjusted based on usability testing.

---

# 41. Suggested Project Architecture

A maintainable structure could resemble:

```text
src/
├── components/
├── pages/
├── layouts/
├── features/
│   ├── dashboard/
│   ├── pos/
│   ├── products/
│   ├── inventory/
│   ├── sales/
│   ├── reports/
│   └── settings/
├── database/
├── services/
├── hooks/
├── stores/
├── types/
├── utils/
├── config/
├── styles/
└── assets/
```

The exact structure should depend on the chosen framework.

---

# 42. Technology Requirements

Before implementation, inspect the existing project.

Determine:

- Framework
- Runtime
- Package manager
- TypeScript setup
- Styling system
- Existing components
- Existing dependencies

If the project is empty, choose a modern stack appropriate for an offline-first application.

Preferred characteristics:

- TypeScript
- Modern component architecture
- Local database support
- Responsive UI
- Maintainability
- Good performance

Do not add dependencies without a reason.

---

# 43. Development Phases

The application should be developed in controlled phases.

## Phase 1 — Project Analysis

Inspect the project before modifying it.

## Phase 2 — Architecture

Define:

- Folder structure
- Data models
- Local database
- Application state
- Services
- Design system

## Phase 3 — Design System

Build:

- Theme
- Components
- Layout
- Navigation
- Forms
- Tables
- Dialogs
- Notifications

## Phase 4 — Database

Implement local database and data models.

## Phase 5 — Dashboard

Build dashboard and analytics.

## Phase 6 — Products

Build product and category management.

## Phase 7 — Inventory

Build stock management and stock history.

## Phase 8 — POS

Build the fast selling workflow.

## Phase 9 — Payments

Build payment and change calculation.

## Phase 10 — Receipts

Build invoice/receipt generation and printing.

## Phase 11 — Sales

Build sales history and reports.

## Phase 12 — Settings

Build business and appearance settings.

## Phase 13 — Backup

Build backup and restore.

## Phase 14 — Testing

Test all major workflows offline.

---

# 44. Testing Requirements

Test the following scenarios.

## Product

- Add product
- Edit product
- Delete product
- Search product
- Change price

## Inventory

- Receive stock
- Adjust stock
- Low stock
- Out of stock
- Stock history

## POS

- Add product
- Change quantity
- Remove product
- Multiple products
- Insufficient stock
- Empty sale

## Payment

- Exact payment
- Overpayment
- Change calculation
- Invalid payment
- Different payment methods

## Sales

- Complete sale
- Verify inventory reduction
- Verify sale history
- Open previous sale

## Receipt

- Generate receipt
- Preview receipt
- Print receipt
- Reprint previous receipt

## Offline

Disconnect the internet and verify that all core operations still work.

## Backup

- Export data
- Import data
- Invalid backup
- Restore verification

---

# 45. Important Business Rules

The application must follow these rules:

1. Customers do not need accounts.
2. Core functionality must work offline.
3. Products must be stored locally.
4. Sales must be stored locally.
5. Inventory must update after successful sales.
6. A sale cannot exceed available stock.
7. Invoice numbers must not duplicate.
8. Payment must be validated.
9. Backup must be available.
10. Restore must be validated.
11. Shop information must be configurable.
12. Products must not be hard-coded.
13. Categories must be configurable.
14. Payment methods must be configurable.
15. The POS must be fast.
16. The UI must be modern.
17. The design must be customizable.
18. The system must be prepared for future expansion.

---

# 46. What This Application Is

This application is:

> A modern offline-first beverage shop POS, inventory, sales, invoice, and business management system.

It allows shop staff to manage the shop from one application without depending on internet access.

---

# 47. What This Application Is NOT

This application is NOT:

- A public online marketplace
- A social network
- A customer-account platform
- A delivery marketplace
- A customer-facing shopping website
- An internet-dependent POS
- A simple product list
- A static demo

The goal is to build a serious foundation for a real-world shop management application.

---

# 48. Future Expansion Possibilities

The architecture should allow future additions such as:

- Barcode scanning
- Supplier management
- Purchase management
- Expense management
- Customer records
- Staff accounts
- Role-based permissions
- Multi-device support
- Cloud synchronization
- Multi-branch shops
- Advanced analytics
- Automated backups
- Mobile application
- Thermal printer integration
- Receipt printer integration
- Accounting integrations

These should be added only when required.

---

# 49. Final Product Vision

The finished application should allow me to run the daily sales and inventory operations of my beverage shop from one modern application.

The ideal experience is:

```text
Open App
   ↓
Dashboard
   ↓
Customer requests beverages
   ↓
Open POS
   ↓
Search/select products
   ↓
Enter quantities
   ↓
Application calculates total
   ↓
Record payment
   ↓
Generate receipt
   ↓
Complete sale
   ↓
Inventory automatically decreases
   ↓
Transaction saved
   ↓
Continue serving the next customer
```

The application must remain usable even when the internet is completely unavailable.

The long-term goal is to have a reliable, professional, customizable, offline-first shop management system that can eventually grow into a larger business platform without requiring a complete rewrite.
