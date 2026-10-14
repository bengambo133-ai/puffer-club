# Puffer Club store

The storefront uses Vite for its browser assets, Supabase Auth for customer accounts, Stripe Checkout for payments, Vercel Functions for server-side Stripe calls, and Supabase Postgres for paid orders.

Customers can save products to their favorites and filter the collection to those products. Signed-in customers' favorites sync through Supabase across devices; guest favorites remain in the current browser and merge into the account on sign-in.

## Run locally

1. Install Node.js 18 or newer.
2. Install project dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project. The publishable key (`sb_publishable_...`) can be used as `VITE_SUPABASE_ANON_KEY`. These two values are public client configuration; never put a Supabase service-role key or Stripe secret key in a `VITE_` variable.
4. Start the Vite development server with `npm run dev`. Vite serves the front end, but its development server does not run the Vercel `/api` functions. Test checkout and webhook flows on a Vercel preview deployment.
5. Run `npm run build` to build the static front end into `dist`.

## Supabase setup

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings > Environment Variables for every deployment environment (production, preview, and development). Use the project URL and anon/publishable key; redeploy after changing them.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor to create the orders table and its customer-only read policy.
3. Run [`supabase/favorites.sql`](./supabase/favorites.sql) in the Supabase SQL editor to create the customer-only favorites table and its row-level security policies. This migration is required for cross-device account favorites.
4. In Supabase Authentication > URL Configuration, set the production Site URL and add the production origin, `http://localhost:5173/**`, and the Vercel preview origins to Redirect URLs. The app redirects signup confirmation and password recovery to the current site origin; that origin must be allowed. Enable email signup and configure email confirmation and password recovery email templates.
5. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel only. It grants privileged server-side access and must never be exposed to the browser.

## Stripe and Vercel setup

1. Import this project into Vercel. Its [`vercel.json`](./vercel.json) builds with `npm run build` and publishes `dist`; files in `api/` are deployed as serverless functions.
2. Add the Stripe test secret as `STRIPE_SECRET_KEY`, the exact HTTPS deployment origin as `SITE_URL`, and the Supabase settings above in Vercel Project Settings > Environment Variables. Do not prefix private values with `VITE_`.
3. Create a Stripe shipping rate and set its ID as `STRIPE_SHIPPING_RATE_ID`. Set `STRIPE_ALLOWED_COUNTRIES` to the countries actually served, as comma-separated ISO 3166-1 alpha-2 codes. Set `STRIPE_TAX_BEHAVIOR` to the confirmed pricing tax behavior and `STRIPE_AUTOMATIC_TAX` to `true` only after configuring and validating Stripe Tax.
4. Configure a Stripe webhook at `https://<production-domain>/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Set the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.
5. After verifying the displayed test catalog against the server catalog, set `STORE_LIVE_CATALOG_CONFIRMED=true` on a Vercel preview with Stripe test keys to exercise checkout. Keep it `false` on production until the real catalog and merchant settings are confirmed.
6. Test account creation, email confirmation, password reset, checkout cancellation, successful test payment, and webhook order persistence on a Vercel preview before production.

Checkout is deliberately unavailable until `STORE_LIVE_CATALOG_CONFIRMED=true`. Do not enable it until the seller has verified every product name, color, size and price in `api/create-checkout-session.js`, plus the real shipping, tax, and destination-country settings. Before accepting real customers, publish and verify the seller's legal identity, contact details, product descriptions/composition, delivery terms, returns/refunds policy, terms of sale, and privacy/cookie disclosures. Those business facts are not guessed or supplied by this code.

The browser cart is stored locally and is not authoritative: the server validates the product, variant, size, and quantity and sets all item prices before creating a Stripe Checkout session. A cart is cleared only after the return page confirms `payment_status=paid` through `/api/checkout-status`. The webhook independently verifies Stripe's signature and records paid orders idempotently.
