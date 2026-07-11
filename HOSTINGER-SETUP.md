# Putting the shop live on Hostinger

Your site runs as-is on Hostinger's standard web hosting (the checkout is a
single PHP file, `checkout.php`, which works on all Hostinger plans). Stripe
handles the payment and **emails the buyer an invoice PDF + receipt**.

## 1. Roll your Stripe key (if it was ever shared)
<https://dashboard.stripe.com/apikeys> → Secret key → **Roll → Immediately**.
Keep the new key private. Start with a **test** key (`sk_test_…`) to try it.

## 2. Turn on Stripe's emails (this sends the invoice)
Stripe Dashboard → **Settings → Customer emails** → turn on **Successful
payments** and **Send finalized invoices**. Under **Settings → Business**,
set your business name + logo (these show on the invoice).

## 3. Upload the site to Hostinger
In hPanel → **Files → File Manager** (or use FTP), open `public_html`, and
upload the whole project so these are inside `public_html`:
- `index.html`, `product.html`, `success.html`, `cancel.html`
- `checkout.php`
- the `css/`, `js/`, `data/`, `assets/`, and `server/` folders
  (`server/catalogue.json` must be present — `checkout.php` reads it)

Tip: zip the project, upload the zip, and use "Extract" in File Manager.

## 4. Add your Stripe key (one of two ways)
**Easiest — a small PHP file:**
1. Copy `stripe-secret.example.php` to **`stripe-secret.php`** (same folder
   as `checkout.php`).
2. Edit it and paste your key:
   ```php
   <?php return 'sk_test_your_key_here';
   ```
   This file is never public — PHP runs it, so requesting it returns nothing.
   (It's git-ignored so it won't get overwritten by updates.)

**Or — an environment variable** (if your plan exposes them): set
`STRIPE_SECRET_KEY` in hPanel. Optional: `SHOP_NAME`, `SHIP_COUNTRIES`.

## 5. Point your domain & test
- Connect **hardcpy.shop** in hPanel → Domains (or use the free temporary domain to test first).
- Visit the site, add an item, click **Checkout**.
- Pay with test card **4242 4242 4242 4242**, any future date / any CVC.
- You should land on the "order confirmed" page and receive the receipt +
  invoice email.

## 6. Go live
Swap `stripe-secret.php` to your **live** key (`sk_live_…`). Done — real
orders now work, and Stripe emails each buyer their invoice. When you ship,
add the tracking number to the order in the Stripe Dashboard.

---

### Notes
- `js/config.js` already points the Checkout button at `/checkout.php`, so
  there's nothing else to wire.
- Requirements: PHP with cURL (on by default on Hostinger). Nothing to
  install.
- Keep `stripe-secret.php` out of any public backup/repo — it holds your key.
- Prefer HTTPS (Hostinger gives free SSL) so card details and redirects are
  secure.
