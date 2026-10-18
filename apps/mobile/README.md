# MGK Pharmacy: mobile app (Flutter)

Android and iOS app for the same platform as the website. It talks to the **same Node.js API** (`apps/api`), so accounts, orders, prescriptions, payments, roles and live delivery tracking are shared. An order placed in the app shows on the website and vice versa.

## What's in the app

**Customers**
- **Shopping:** home, shop and search with filters and sort, category pages, product pages (with cheaper same-ingredient alternatives), and a cart with a live server quote.
- **Checkout:**
  - delivery or pickup, saved addresses
  - a **map pin or "use my location"**
  - prescription upload by **camera, gallery or PDF**
  - Paystack (in-app web view, payment verified by the API), bank transfer or pay at pickup
- **Orders:** progress tracker, bank details with copy buttons, receipt upload, Pay now, cancel, buy again, and the **live rider map with the delivery code**.
- **Account:** overview, orders, prescriptions, identity verification, addresses, profile and password, and guest order tracking.
- **Info:** help and policy pages, and a contact form.

**Riders**
- deliveries list, map, call, Google Maps directions
- **Start trip** shares phone GPS and keeps the screen awake
- confirm delivery with the customer's code

**Staff** (menu filtered by role, enforced by the API)
- overview, orders (confirm payment, dispatch to rider, status, refunds, live map)
- prescription and ID review (with in-app viewer for images and PDFs)
- products and stock batches, inventory, customers, messages
- staff & roles (add people, change roles, deactivate, reset passwords, activity log)

Admins, pharmacists, support, inventory managers and riders all sign in from the same login screen and land on their own home.

## Run it

1. Start the API and web app from the repo root: `npm run dev`.
2. Start an Android emulator, then:

```bash
cd apps/mobile
flutter run
```

The app talks to `http://localhost:4000` by default. Plug in a phone by USB (or start an emulator), then link the device to the API on this computer:

```bash
adb reverse tcp:4000 tcp:4000
flutter run
```

Run `adb reverse` again whenever the device reconnects; without it, sign-in fails with "We couldn't reach MGK Pharmacy".

For production, pass the API address:

```bash
flutter run --dart-define=API_URL=http://192.168.1.20:4000
flutter build apk --release --dart-define=API_URL=https://api.your-domain.com --dart-define=DEV_TOOLS=false
```

`DEV_TOOLS=false` hides the rider "simulate drive" button. The API also disables simulation in production.

## Test

`integration_test/app_flow_test.dart` drives the real app against the running API:
1. a customer signs in, searches, adds to cart and checks out by bank transfer
2. a pharmacist confirms payment and dispatches to a rider (the live map appears)
3. the rider sees the delivery

Pass the **local seed accounts** from `apps/api/.env` with `--dart-define` (see the top of the test file):

```bash
flutter test integration_test/app_flow_test.dart -d emulator-5554 --dart-define=CUSTOMER_EMAIL=... (etc.)
```

## How sign-in works

The website keeps the session in an httpOnly cookie. The app sends `X-Client: mobile`, receives the same signed session token in the login response, and keeps it in **Android Keystore / iOS Keychain** (`flutter_secure_storage`). It sends the token as `Authorization: Bearer …`. Role changes, deactivation and password resets sign the app out too.

## Before publishing to the stores

- Point `API_URL` at the production **https** API. Plain http is only allowed in debug builds (`android/app/src/debug/AndroidManifest.xml`).
- Replace the `PLACEHOLDER` contact details in `lib/core/config.dart` (keep them in sync with the website's `lib/site.ts`).
- **Map tiles:** the app uses OpenStreetMap's free tile server, which is for light use only. Switch `TileLayer` in `lib/widgets/map_view.dart` to a commercial provider (MapTiler, Mapbox, Stadia).
- **Branding:** the app icon and splash use the MGK mark, drawn by `tool/make_brand_assets.py` (regenerate with `dart run flutter_launcher_icons` and `dart run flutter_native_splash:create`). Still to do: the release signing config in `android/app/build.gradle.kts`.
- **Riders:** location sharing runs while the app is open (the screen is kept awake). For sharing with the screen off, add a background location service and the matching store declarations.
- **iOS:** build on a Mac with Xcode. Permission texts are already in `ios/Runner/Info.plist`.
