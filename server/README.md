# HARDCPY — checkout backend (Stripe)

The Stack checks out through **Stripe Checkout**, and Stripe **emails the
buyer an invoice (PDF) + receipt** automatically after payment. A static
site can't hold a secret key or charge cards, so a tiny serverless
function does it — and it deploys **together with the site** as one Vercel
project (functions live in `/api`).

## Files
- `/api/checkout.js` — builds a Stripe Checkout Session from the cart.
- `/api/webhook.js` — optional: your own sale notification / mark-as-sold.
- `server/lib/checkout.js` — pure, unit-tested line-item + session builder.
- `server/catalogue.json` — id → title → amount (cents). Prices come only
  from here; the client can't set prices. Regenerated from `data/books.js`.
- `server/test.js` — offline tests (`node server/test.js`).

## Flow
Buyer clicks **Checkout** → site POSTs the cart to `/api/checkout` →
function validates prices and creates a Checkout Session with
`invoice_creation` on → buyer pays on Stripe (enters email + shipping) →
Stripe **emails the invoice + receipt** and returns them to `/success.html`
→ you see the order in Stripe and add tracking when you ship.

## Setup (one Vercel deploy)

1. **Roll your Stripe key** if it was ever exposed:
   https://dashboard.stripe.com/apikeys → Secret key → **Roll** → Immediately.
   Keep the new key private.
2. **Turn on Stripe customer emails** so the invoice/receipt actually send:
   Dashboard → Settings → *Customer emails* → enable **Successful payments**
   and **Send finalized invoices**. Set your business name/logo under
   Settings → *Business*.
3. **Deploy to Vercel:** create an account at vercel.com, **Add New →
   Project → Import** this GitHub repo. Framework preset: **Other**. Deploy.
   (Set the Production Branch to your working branch, or merge to `main`.)
4. **Add the secret** in Vercel → Project → Settings → Environment
   Variables (see `.env.example`):
   - `STRIPE_SECRET_KEY` = your `sk_live_…` (or `sk_test_…` to test first)
   - `SHOP_NAME` = `HARDCPY` (optional)
   Then **Redeploy**.
5. Your site is live at `https://<project>.vercel.app`, and checkout works
   at `/api/checkout` on that same domain — `js/config.js` already points
   there, so there's nothing else to wire.

### Test before going live
Use a `sk_test_…` key and card `4242 4242 4242 4242` (any future expiry /
CVC). You should reach `/success.html` and get the receipt + invoice email.
Swap in the `sk_live_…` key when ready.

## Optional: get notified of sales (webhook)
Dashboard → Developers → Webhooks → add `https://<project>.vercel.app/api/webhook`,
event `checkout.session.completed`. Put its signing secret in
`STRIPE_WEBHOOK_SECRET`, redeploy, and extend the marked section of
`api/webhook.js` to email/Slack yourself. (Stripe already emails the buyer.)

## Custom domain
Add your domain in Vercel → Settings → Domains. Everything keeps working
because the API is same-origin.
