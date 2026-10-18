# MGK Pharmacy — Site Review & Fix List

Reviewed: 15 October 2026 · Site: https://mgkpharmacy.com/
Scope: public pages only (homepage, product pages, account, cart, FAQ, terms, order tracking, prescription verification form). No account was created, nothing was added to the cart, and no forms were submitted.

---

## 1. What the site is

An online storefront for MGK Pharmacy, a physical pharmacy in Kano, Nigeria. Prices are in Naira (₦).

- **Address:** Plot 53, Karkasara, behind the AKTH exit gate
- **Phone:** 08067834890 (advertised as 24/7)
- **Built with:** WordPress, WooCommerce, the Electro theme, Elementor and WPBakery page builders, Slider Revolution, Gravity Forms, WooCommerce Memberships, Google Site Kit. Hosted on Hostinger with LiteSpeed caching and Wordfence security.

## 2. What it does

### Catalogue
- About **6,513 products** in about 90 categories (antimalarials, antihypertensives, antibiotics, anti-ulcer, pain management, vitamins and supplements, creams, injections, drops, contraceptives, children's care, and more).
- Homepage: banner slider and product carousels (New / Supplements / Best Selling, Stop Malaria, BP Medications, Trending, Bestsellers, Top Sales this Month, Recommendation for your Health).
- Product pages: stock level, description, SKU, brand, tags, star-rating review form.

### Shopping and checkout
- Header search with a category filter, a category mega-menu, add-to-cart, and a cart total in the header.
- **Active payment method: direct bank transfer only.**
- Homepage promises: free delivery over ₦50,000, "3 days for free return", "Payment Secured System", "99% Positive Feedbacks".

### Prescription-only and controlled medicines
- About 146 products are tagged POM and 34 are tagged Controlled.
- These require **profile verification** (`/verify-profile/`) before purchase. The form asks for name, email, address, WhatsApp number, verification type, government ID, prescription, MDCN licence, PCN annual licence and a "Genuity" confirmation.
- Product pages say the prescription is uploaded in the cart before checkout.

### Customer accounts
- Login, plus registration with an email address (a password-setup link is emailed).
- Order tracking by order ID and billing email (`/track-your-order/`).

### Policies (FAQ and Terms)
- Written to Nigerian rules: the NDPR 2019 and NDPA 2023 data protection laws, PCN and NAFDAC.
- Data retention: prescriptions 5 years, financial records 7 years, inactive accounts deleted after 3 years.
- Returns: within 48 hours, only for wrong items, damage, expiry or a NAFDAC recall. POMs, cold-chain items and opened packs can't be returned.
- Refund timelines: Paystack 3–5 days, bank transfer 2–3 days, wallet within 24 hours.
- No brand substitution without the prescriber's written approval.

### Analytics
- Google Analytics / Tag Manager through Site Kit, which records shop events, plus WooCommerce's built-in tracking of where orders came from.

## 3. Backend (admin side)

The site has a full backend:
- **WordPress / WooCommerce admin dashboard** for products, orders, customers, coupons, settings and plugins.
- **A custom pharmacy management plugin ("Saukix Pharmacy").** Judging by its feature set, it covers:
  - order queues and actions
  - batch and expiry inventory, low-stock alerts and stock reconciliation
  - prescription document handling
  - refunds and returns workflows
  - staff roles and permissions
  - customer records, coupons, settlement/reconciliation and reports with CSV export
- **Gravity Forms / Gravity Flow**, which most likely powers the profile verification and approval workflow.
- **Uncanny Automator**, for automations.

The backend can only be reviewed properly by logging in as an administrator.

---

## 4. Fix list (prioritised)

### High — broken, or damaging customer trust
| # | Issue | Where | Suggested fix |
|---|---|---|---|
| 1 | "Start Buying" button leads to a **404** page | Homepage → `/shop` | Point it at the real shop page, or set the WooCommerce Shop page (WooCommerce → Settings → Products) and create `/shop/` |
| 2 | **"TEST PRODUCT" (₦50)** shown in the Trending carousel | Homepage | Delete it, or set it to Draft/Private |
| 3 | **Return policy contradicts itself**: "3 days for free return" vs 48 hours in the FAQ | Homepage feature bar vs FAQ | Make them match (for example "48-hour returns on eligible items") |
| 4 | **Payment options don't match the policy**: only bank transfer is enabled, but the FAQ mentions Paystack and a wallet | Checkout vs FAQ | Turn on Paystack/wallet, or remove them from the FAQ |
| 5 | **Prices that look wrong**: Paracetamol ₦10, INJ GOCEE ₦50, Shree Cedrine ₦10, Anafranil ₦80, INJ Artemether ₦100 | Product listings | Audit low prices. Check whether they're per tablet or per pack, and label the unit |
| 6 | "99% Positive Feedbacks" claim, but every product has 0 reviews | Homepage | Remove the claim or back it with real reviews/testimonials |

### Medium — content and data quality
| # | Issue | Where | Suggested fix |
|---|---|---|---|
| 7 | **3,983 of 6,513 products are "Uncategorized"** | Catalogue | Bulk-assign categories (the plugin's product import/export or WooCommerce CSV import can do this) |
| 8 | **Duplicate categories**: "Antibiotics" ×3, "Injections" ×6, "Antifungals" ×2, Contraceptive/Contraceptives, antihypertensive/Antihypertensives, Antihistamine/Anti Histamines, Antiseptic/antiseptics | Categories | Merge duplicates and standardise capitalisation |
| 9 | Terms page says **"last modified on 18 February 2016"** above content dated July 2026 | `/terms-and-conditions/` | Remove the old line |
| 10 | Banner text **"FROM ₦10099"** looks like a typo | Homepage slider | Correct the price |
| 11 | **FAQ wording is odd**: "structural seals", "full structural refund", "logistics parsing", "information balance statement" | `/frequently-asked-questions/` | Rewrite in plain English |
| 12 | A **pasted Google redirect link** in the Paroxiten 20mg description | Product page | Replace it with a direct link or remove it |
| 13 | Several homepage product names are inconsistent (all caps, "BY 30", "x10") | Catalogue | Agree a naming convention: Brand + strength + form + pack size |

### Low — polish
| # | Issue | Where | Suggested fix |
|---|---|---|---|
| 14 | **Social media icons all link to "#"** | Footer | Add real profile links or remove the icons |
| 15 | Cart lives at `/cart-2/` (sign of a duplicate cart page) | Cart | Delete the old cart page, rename the slug to `/cart/` and re-select it in WooCommerce settings |
| 16 | Upload limits on the verification form are inconsistent: 512 MB for prescription and MDCN licence vs 5 MB for PCN | `/verify-profile/` | Set a sensible limit (around 5–10 MB) and the same file types on every upload field |
| 17 | The verification form requires MDCN **and** PCN licence uploads for every type | `/verify-profile/` | Use conditional logic so patients only see ID and prescription fields, and professionals see licence fields |
| 18 | Many items show "Read more" instead of "Add to cart" (out of stock or POM) with no explanation | Product carousels | Show an "Out of stock" or "Prescription required" badge |

## 5. Logged-in customer walkthrough (15 Oct 2026)

Reviewed as a normal customer (no admin rights). A ₦200 gauze roll was added to the cart to view the cart and checkout pages, then removed. **No order was placed and no form was submitted.**

### What a customer sees
- **My Account menu:** Dashboard, Orders, Memberships, Downloads, Addresses, Account details, Log out. This is standard WooCommerce.
- **Dashboard:** a single generic "Hello, [name]" paragraph, with no summary of orders or verification status.
- **Orders:** two existing orders (#30601 for ₦2,700 and #30602 for ₦5,000), both **"On hold"** with Direct bank transfer as the payment method.
- **Memberships:** "Looks like you don't have a membership yet!", with no explanation of what a membership is or how to get one.
- **Downloads:** empty. It isn't relevant for a pharmacy.
- **Addresses / Account details:** standard billing and shipping address editing, name, email and password change.
- **Prescription-only products (POM / Controlled):** the Add to cart button is hidden. Customers see "can only be purchased after completing full profile verification" and a **Verify Your Profile** button. This gate works.
- **Cart:** quantity, coupon field, **flat-rate shipping ₦2,500** to the saved address, and a change-address link.
- **Checkout** (at `/checkout-2/`): billing details, a Nigerian state dropdown, an optional ship-to-different-address box, order notes, a terms checkbox and **Direct bank transfer** as the only payment option.

### Problems found while logged in
| # | Priority | Issue | Suggested fix |
|---|---|---|---|
| 19 | **High** | **Azithromycin (an antibiotic) was ordered with no prescription** (order #30602). It's tagged only "Antibiotics", not POM, so the prescription gate doesn't apply. Antibiotics are prescription-only in Nigeria. | Tag all antibiotics, antihypertensives, antidiabetics, antipsychotics, etc. as POM. The gate only works if the tagging is complete |
| 20 | **High** | **On the website, bank details appear only on the "Order received" page** (Moniepoint, MGK PHARMA). They are also in the confirmation email. They aren't shown at checkout before ordering, and they're **missing from My Account → order view**, so a customer who closes the page can't find them again. *(Corrected after test order #30603.)* | Show the bank details at checkout, on the order view page and in the confirmation email. Add a "Copy account number" button |
| 21 | **High** | "On hold" orders give the customer no next step: no "Pay now", no "Cancel", no upload-proof-of-payment option | Add payment instructions or a "Pay now" option to the order view, plus a cancel option before dispatch (which the FAQ already promises) |
| 22 | Medium | **Delivery is a ₦2,500 flat rate everywhere.** There's no in-store pickup option even though there's a physical shop in Kano, and no visible free-delivery threshold despite the "Free delivery from ₦50,000" banner | Add Local Pickup (Kano store), zone-based rates (Kano vs other states), and a Free Shipping method with a ₦50,000 minimum |
| 23 | Medium | **No verification status anywhere in My Account.** After submitting the verify-profile form, the customer can't tell whether it's pending, approved or rejected | Add a "Verification" tab or a dashboard notice showing the status |
| 24 | Medium | The verify-profile form **isn't pre-filled** for logged-in users (name, email, phone and address are all re-typed), and its address field lists **every country in the world** for a Nigeria-only service | Pre-fill from the account and limit the country to Nigeria |
| 25 | Medium | The **Memberships** tab shows "you don't have a membership yet" with no explanation | Hide the tab, or explain what membership gives (for example verified patient or professional pricing) |
| 26 | Low | The **Downloads** tab is irrelevant | Hide it (WooCommerce → Settings → Advanced → Account endpoints) |
| 27 | Low | The dashboard is bare | Show recent orders, verification status, saved prescriptions and a reorder button |
| 28 | Low | Checkout lives at `/checkout-2/` (a duplicate page, like `/cart-2/`) | Clean up duplicate pages and reset the WooCommerce page assignments |
| 30 | **High** | **Verification doesn't unlock prescription products.** After the account was verified, Diamicron MR and Dihydrocodeine still showed "Verify Your Profile" and no Add to cart button. Memberships still says "you don't have a membership yet". The gate seems tied to a WooCommerce Memberships plan that approval doesn't grant | Check that approving a verification (Gravity Flow / Saukix) actually grants the membership or role the gate checks; test with a fresh account |
| 31 | **High** | Prescription antidiabetics shown as "related products" on Diamicron's page (Glucophage, Betix/glimepiride, Panfor SR, Sealmet, Glepid, Taformin) **can be added to the cart with no prescription** | Same as #19: tag them POM |
| 29 | Low | Product images use a generic MGK logo placeholder | Add real product photos for best-sellers first |

### Test order #30603 (15 Oct 2026)
Placed with the user's approval: 1 × gauze roll, ₦200 + ₦2,500 delivery = **₦2,700**, by bank transfer. The order note reads "TEST ORDER – website review, please cancel. Do not dispatch." **Not paid. Ask the pharmacy to cancel it.**

**What worked**
- Checkout pre-filled the saved name, address, phone and email. Ordering took one click after ticking the terms box.
- The "Order received" page shows the order number, total, bank details, items, the note and addresses.
- **The order confirmation email arrived and includes the bank details** (confirmed by the customer). Customers can find the account again via the email, but it should still appear on the My Account order view (#20).

**What to improve at checkout and order confirmation**
| # | Priority | Issue | Suggested fix |
|---|---|---|---|
| 32 | **High** | The thank-you page says nothing about **what to do next or how long it takes**: no "send proof of payment to WhatsApp …", no "orders unpaid after 24h are cancelled", no delivery time | Add a clear next-steps box: pay → send proof (WhatsApp link) → we confirm → delivery in X days |
| 33 | **High** | The **bank account name is written as "MGK PHARMA:"** with no account-name line, and the business is "MGK Pharmacy" / "MGK Healthcare". Customers may worry it's the wrong account | Show "Account name: [exact registered name]" matching what customers see in their banking app |
| 34 | Medium | **₦2,500 delivery on a ₦200 item** (delivery is 92% of the order) with no pickup alternative offered | Add Local Pickup and a minimum order, or cheaper rates within Kano |
| 35 | Medium | The order stays **"On hold"** with no way for the customer to cancel or mark it as paid | Add "I've paid / upload receipt" and "Cancel order" buttons to the order view |
| 36 | Medium | **No delivery estimate** anywhere in checkout or confirmation | Show an estimated delivery date per shipping zone |
| 37 | Low | The terms checkbox links to a Terms page dated 2016 (see #9) | Fix the Terms page |
| 38 | Low | The order-received URL contains `/checkout-2/` | Part of the duplicate-pages cleanup (#15, #28) |

## 6. Improvement plan (assuming verification works)

Beyond the fixes above, these would make the biggest difference for a Nigerian online pharmacy.

### A. Payments and getting paid faster
1. **Add Paystack (or Flutterwave)** for card, USSD and bank-transfer-with-auto-confirmation. Orders then confirm instantly instead of sitting "On hold" until staff check the bank.
2. If bank transfer stays, show the account details clearly and add an **"Upload proof of payment"** button on the order page.
3. **Pay on pickup / pay on delivery** within Kano for repeat or verified customers.

### B. Delivery
4. **Shipping zones:** Kano city, rest of Kano State, the North-West, other states, each with its own price and estimated delivery time.
5. **Free in-store pickup** at the Karkasara branch (also the cheapest way to handle cold-chain items).
6. Actually apply the **₦50,000 free-delivery** rule, and show a bar like "₦12,000 away from free delivery" in the cart.
7. **Order status updates by WhatsApp/SMS:** paid → being packed → dispatched → delivered. The verification form already collects a WhatsApp number.

### C. The prescription journey
8. **One clear guided path:** product page → "Upload prescription" → pharmacist review → item unlocked. Show status in My Account (Pending / Approved / Rejected, with the reason).
9. **Let customers upload a prescription without a product**, so the pharmacist can build the cart for them. Many customers have a paper prescription and don't know brand names.
10. **Saved prescriptions** in My Account with expiry dates, and **one-click refill** for repeat medication (BP, diabetes).
11. **Refill reminders** by WhatsApp or email when a 30-day supply is about to run out. This is good for repeat revenue.
12. **"Chat with a pharmacist" WhatsApp button** on every product and cart page.

### D. Catalogue and search
13. **Clean up categories** (items 7–8) and give **every** prescription drug the correct POM tag (items 19 and 31). This is a compliance priority.
14. Add **generic names** to products (for example "Glucophage 500mg — Metformin") so searching by generic name finds every brand.
15. **Real product photos** for the top 200 sellers, plus **pack size and unit** on every price.
16. **"Out of stock — notify me"** and a pharmacist-approved alternative-brand suggestion.
17. Show **"Prescription required"** and **"Out of stock"** badges on product cards instead of a vague "Read more".

### E. Trust and conversion
18. Show **PCN premises registration number**, the superintendent pharmacist's name, and a NAFDAC/PCN verification badge in the footer and at checkout.
19. **Real reviews**: ask for one after delivery. Remove claims you can't back up ("99% positive").
20. **A proper About / Contact page** with a map of the Kano store, opening hours, WhatsApp and email.
21. Rewrite the FAQ in plain English, and make policies consistent across homepage, FAQ and Terms.

### F. Account area
22. A useful **dashboard**: recent orders, verification status, saved prescriptions, reorder buttons.
23. Hide **Downloads**, and hide or explain **Memberships**.
24. **Guest checkout with phone number** for over-the-counter items, which suits customers who won't create an account.

### G. Technical and performance
25. Remove unused page builders (the site loads **both** Elementor and WPBakery, plus Slider Revolution), which slow it down on mobile data.
26. Clean up duplicate pages (`/cart-2/`, `/checkout-2/`) and fix `/shop` (404).
27. Compress images, and test on a cheap Android phone over 3G. That's what most customers use.
28. Delete test products and keep a staging copy of the site for testing changes.
29. Set up **SEO basics**: unique product descriptions (not copy-paste), and local SEO for "pharmacy in Kano" (Google Business Profile linked to the site).

### Suggested order of work
1. **Week 1 (compliance and money):** POM tagging (19, 31), verification → membership fix (30), bank details and payment instructions (20–21), remove the test product, fix `/shop`.
2. **Weeks 2–3 (conversion):** Paystack, shipping zones, pickup, free-delivery rule, WhatsApp button, consistent policies.
3. **Month 2 (retention):** prescription status in My Account, saved prescriptions, refill reminders, order WhatsApp updates.
4. **Ongoing:** category cleanup, photos, generic names, reviews, performance.

## 7. Still not checked
- Placing an order end to end, including the thank-you page and the confirmation email
- Submitting the verify-profile form and the prescription upload in the cart
- The admin backend and the custom pharmacy plugin's screens
