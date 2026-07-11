# OuiOui Prints — Stripe checkout backend

A tiny serverless backend that turns the storefront's Stack into a real
Stripe Checkout, and has Stripe **email the buyer an invoice (PDF) and a
receipt** automatically after payment.

The static site (GitHub Pages) can't hold secret keys or charge cards, so
this small function does it. You deploy it once to your own Stripe + host.

## How it works

1. Buyer clicks **Checkout** → the site POSTs the cart to `/api/checkout`.
2. The function looks up each item's price in `catalogue.json` (the client
   never sets prices) and creates a Stripe Checkout Session with
   `invoice_creation` enabled.
3. Buyer is redirected to Stripe's hosted page, enters **email + shipping
   address**, and pays.
4. Stripe charges the card, then **emails the buyer a receipt and a
   finalized invoice PDF**, and returns them to `/success.html`.
5. You get the order in your Stripe Dashboard (and via `/api/webhook` if
   you set it up). Add the tracking number in Stripe when you ship.

## Setup (Vercel — ~10 minutes)

1. **Create a Stripe account** and grab your secret key from
   <https://dashboard.stripe.com/apikeys> (use a **test** key first).
2. In the Stripe Dashboard → Settings → *Customer emails*, turn on
   **"Successful payments"** and **"Send finalized invoices to customers"**
   so receipts and invoices actually send. Set your business name/logo
   under Settings → *Business*.
3. Deploy this `server/` folder to Vercel:
   - `npm i -g vercel` then, inside `server/`, run `vercel` (or import the
     repo at vercel.com and set the **Root Directory** to `server`).
4. Add environment variables in Vercel (Project → Settings → Environment
   Variables) — see `.env.example`:
   - `STRIPE_SECRET_KEY` = your `sk_test_…` (then `sk_live_…` when ready)
   - `SITE_URL` = your storefront URL (e.g. `https://ouiouiprints.com`)
   - `ALLOWED_ORIGIN` = same as `SITE_URL`
   - `SHOP_NAME` = `OuiOui Prints` (or your final name)
5. Redeploy. Your endpoint is `https://<project>.vercel.app/api/checkout`.
6. Put that URL in **`js/config.js`** at the site root:
   ```js
   window.STOREFRONT = { checkoutEndpoint: "https://<project>.vercel.app/api/checkout" };
   ```
   Commit & push. Checkout is now live.

### Test it
Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
You should land on `/success.html` and receive the receipt + invoice email.
Flip `STRIPE_SECRET_KEY` to your live key when you're ready for real sales.

## Optional: sale notifications / mark-as-sold (webhook)

1. Stripe Dashboard → Developers → Webhooks → add endpoint
   `https://<project>.vercel.app/api/webhook`, event
   `checkout.session.completed`.
2. Copy its signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.
3. Edit the marked section in `api/webhook.js` to email/Slack yourself or
   flag the item sold. (Stripe already emails the *buyer*; this is for you.)

## Keeping prices in sync
`catalogue.json` is regenerated from `data/books.js` by the catalogue
build, so it always matches the site. Redeploy the function after prices
change. It contains only id → title → amount (cents); no secrets.

## Other hosts
- **Netlify**: move handlers to `netlify/functions/checkout.js` exporting
  `exports.handler = async (event) => …` (parse `event.body`, return
  `{ statusCode, body }`). Same env vars.
- **Cloudflare Workers**: use the Stripe REST API via `fetch` with the same
  session params from `lib/checkout.js`.
