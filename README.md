# MGK Pharmacy platform

A full rebuild of an online pharmacy for MGK Pharmacy, Kano, Nigeria.

- **`apps/web`**: the storefront and pharmacy admin, built with Next.js 16 (App Router), React 19 and Tailwind CSS.
- **`apps/api`**: the REST API, built with Node.js, Express and TypeScript, using Prisma with PostgreSQL (Neon).

There is also an **Android/iOS app** in `apps/mobile` (Flutter). It uses the same API, so customers, riders and staff can use either the app or the website. See [apps/mobile/README.md](apps/mobile/README.md).

## Quick start

Requires Node.js 20.9 or newer and a Postgres database. Use a free [Neon](https://neon.tech) `dev` branch (see [DEPLOY.md](DEPLOY.md), step 1) and put its connection strings in `apps/api/.env` (`DATABASE_URL`, `DIRECT_URL`).

```bash
npm run setup   # install deps, create apps/api/.env, create + seed the database
npm run dev     # API on http://localhost:4000, website on http://localhost:3000
```

Test accounts (customer, pharmacist, admin, rider) are listed in `apps/api/.env.example`. They're for local development only.

Re-seed at any time with `npm run setup -w apps/api`. This wipes the database it points at (it asks first if there's data).

**Hosting** (Vercel, Render, Neon, Cloudflare R2): see [DEPLOY.md](DEPLOY.md).

## Importing MGK's real catalogue

The seed creates an 81-product demo catalogue. To load MGK Pharmacy's full catalogue (6,498 products), run the following. Do this with MGK's permission, which has been given.

```bash
npm run fetch:mgk -w apps/api                 # download the public catalogue to apps/api/prisma/data/mgk-products.json
npm run import:mgk -w apps/api -- --demo-stock  # local demo: in-stock items get a 12-month demo batch
npm run import:mgk -w apps/api                # real use: no stock is created; staff count and receive it in admin
```

What the importer does:
- maps MGK's ~90 inconsistent categories, plus the 3,940 "Uncategorized" items, onto 18 clean categories
- assigns OTC, POM or CONTROLLED by drug class
- extracts brand, strength, form, pack size and generic name

**Unrecognised medicines default to prescription-only for safety.**

Every product that needs a pharmacist's check is listed in `apps/api/prisma/data/mgk-import-report.csv`, and in admin under Products → "Review now". Report flags:
- `CATEGORY_UNKNOWN`
- `RX_DEFAULTED_TO_POM`
- `GENERIC_UNKNOWN`
- `CHECK_LOW_PRICE`
- `DUPLICATE_NAME`

## What it does

### Customers
- **Catalogue:** 14 health-need categories, with search by brand or generic name, filters (prescription type, price, stock) and sorting.
- **Product pages:**
  - clear dispensing class (OTC, prescription-only, controlled) and expiry information
  - cheaper same-ingredient alternatives
  - delivery and pickup info, plus a WhatsApp pharmacist link
- **Cart:**
  - live server-side price and stock checks
  - a free-delivery progress bar
  - delivery estimate by state
- **Checkout:**
  - guest checkout for OTC items
  - saved addresses
  - delivery or free store pickup
  - Paystack, bank transfer or pay at pickup
- **Prescriptions:**
  - upload at checkout or in the account
  - pharmacist review before payment
  - approved prescriptions are reusable until they expire
- **Controlled medicines** need a one-time identity verification (patient, doctor or pharmacist).
- **Order page:**
  - progress tracker, bank details with copy buttons and a pay-by deadline
  - receipt upload, pay online, cancel before dispatch (automatic refund flag), and buy again
- **Account:** overview, orders, prescriptions, verification, addresses, profile and password.
- **Order tracking** for guests by order number and email.
- **Policy pages** (FAQ, delivery, returns, privacy under NDPA 2023, terms) in plain English and consistent with each other.

### Pharmacy staff (`/admin`)
- **Overview:** revenue and work queues (prescriptions, transfer receipts, verifications, low stock, expiring batches, messages).
- **Orders:**
  - filters and search
  - confirm transfers, which moves the order to processing
  - status changes that respect delivery versus pickup
  - cancel with automatic restocking, and mark refunds done
- **Prescription review** with inline file preview, approve (with validity period) or reject (with reason). Linked orders move forward automatically.
- **Identity verification** review.
- **Products:**
  - create and edit
  - dispensing class, cold chain, featured, visibility
- **Stock batches** with expiry dates. Sales draw from the earliest-expiring batch first (FEFO). Batches can be quarantined or recalled.
- **Inventory:** low-stock and expiring-batch reports.
- **Customers and contact messages.**

### Staff, roles & permissions (`/admin/staff`, administrators only)

| Role | Access |
|---|---|
| Administrator | Everything, including staff management |
| Pharmacist | Orders, prescription & ID review, products, stock, customers, messages |
| Customer support | Orders (status, payments, dispatch), customers, messages. No prescription review or product editing |
| Inventory manager | Products, stock batches and expiry only. No orders or customer data |
| Delivery rider | Rider app only |
| Customer | Shop and own account |

**Managing people:**
- Admins add people with a role. The system generates a **one-time password**, shown once, to hand over in person. It is never emailed.
- New users must choose their own password at first sign-in; the API blocks everything else until they do.
- Admins can change roles (including promoting an existing customer), deactivate or reactivate accounts, and reset passwords.

**Sessions:** role changes, deactivation and password resets sign the person out everywhere immediately, using a per-user session version in the sign-in token.

**Safeguards:**
- admins can't change their own role or deactivate themselves
- the last active administrator can't be removed
- riders with deliveries in progress can't be reassigned

**Enforcement and logging:**
- Permissions live in one place (`apps/api/src/lib/constants.ts`, `ROLE_PERMISSIONS`). Every `/admin` API route is matched to a permission, and **unlisted routes are denied by default**.
- The web app hides menu items, dashboard figures and pages a role can't use, but the server is what enforces access.
- Every staff change is recorded in the **activity log**.

### Live delivery tracking
- **Checkout:** customers can drop a delivery pin on a map, or use their phone's location. Without a pin, the address is looked up automatically (OpenStreetMap Nominatim), falling back to the town centre.
- **Dispatch:** staff choose a rider when sending an order out. The customer gets a 4-digit **delivery code** by email.
- **Rider app** (`/rider`, phone-friendly):
  - call the customer, open turn-by-turn directions in Google Maps, and "Start trip" to share GPS location (the screen is kept awake where supported)
  - confirm delivery by entering the customer's code; a wrong code is rejected
- **Customer order page:**
  - live map with the pharmacy, rider and home markers, the route travelled and a dashed line to the destination
  - arrival estimate, last-updated time, a weak-signal warning, a call-rider button and the delivery code
  - refreshes every 4 seconds
- **Staff** see the same live map on the admin order page.
- **Privacy:** location history is deleted as soon as the order is delivered, and only the order's customer and staff can see it.
- **Demo:** outside production, each delivery in the rider app has a "simulate this drive" button that drives the rider from the pharmacy to the customer over about 90 seconds.

Production notes:
- set the store's exact coordinates (`STORE_LAT` / `STORE_LNG`)
- use a commercial map-tile and geocoding provider (Mapbox, MapTiler or Google), as the free OpenStreetMap services are for light use only
- consider a native rider app for reliable background location

### Platform
- Unpaid bank-transfer orders are cancelled automatically after 48 hours (`UNPAID_ORDER_TTL_HOURS`) and the stock is released.
- **Security:**
  - httpOnly session cookies and bcrypt password hashing
  - rate-limited sign-in, Zod validation on every input and Helmet headers
  - private uploads served only to the owner or staff
  - Paystack webhook signature checks, with server-side payment verification on return
- **SEO:** metadata on every page, product structured data (schema.org), sitemap and robots rules.
- **Accessibility:** skip link, semantic landmarks, labelled form fields, visible focus states and live regions.

## Before going live

Follow [DEPLOY.md](DEPLOY.md), then:

1. Replace every value marked `PLACEHOLDER` in `apps/web/lib/site.ts` and `apps/mobile/lib/core/config.dart`: phone, WhatsApp, email, PCN premises number and superintendent pharmacist.
2. Swap the Paystack test key for the **live** key on Render once a test order has worked end to end.
3. Replace the console mailer in `apps/api/src/lib/mailer.ts` with an email or SMS/WhatsApp provider, then add password reset by email.
4. Check the imported catalogue: every prescription medicine **must** be tagged POM or CONTROLLED.
5. Switch map tiles and geocoding to a commercial provider.
