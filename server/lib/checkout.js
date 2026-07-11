// Pure helpers for building a Stripe Checkout Session from a cart.
// Kept dependency-free so it can be unit-tested without Stripe or network.

const MAX_QTY = 10;

// Build Stripe line_items from a { id: qty } cart using the server-side
// catalogue as the ONLY source of prices — client prices are ignored.
function buildLineItems(cart, catalogue) {
  const items = [];
  if (!cart || typeof cart !== "object") return items;
  for (const id of Object.keys(cart)) {
    const qty = cart[id];
    const p = catalogue[String(id)];
    if (!p) continue;
    const q = Math.min(Math.max(parseInt(qty, 10) || 0, 0), MAX_QTY);
    if (q < 1) continue;
    items.push({
      quantity: q,
      price_data: {
        currency: p.currency || "usd",
        unit_amount: p.amount, // integer cents, from the server catalogue
        product_data: { name: p.title, metadata: { sku: String(id) } },
      },
    });
  }
  return items;
}

// Parameters for stripe.checkout.sessions.create(...).
// Enables invoice_creation so Stripe finalizes and emails a PDF invoice
// to the buyer after payment, and collects email + shipping address.
function sessionParams(lineItems, opts) {
  const o = opts || {};
  const site = (o.siteUrl || "").replace(/\/+$/, "");
  return {
    mode: "payment",
    line_items: lineItems,
    customer_creation: "always",
    billing_address_collection: "auto",
    phone_number_collection: { enabled: true },
    shipping_address_collection: {
      allowed_countries: o.allowedCountries && o.allowedCountries.length
        ? o.allowedCountries
        : ["US", "CA", "GB", "AU", "JP", "DE", "FR", "IT", "ES", "NL", "SE", "NO", "DK", "IE", "NZ", "SG", "HK", "KR"],
    },
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: o.shopName ? (o.shopName + " — order") : "Order",
        footer: "Thank you for supporting an independent archive. All items are authentic and one-of-one.",
        metadata: { source: "storefront" },
      },
    },
    // Stripe emails a payment receipt too; invoice_creation adds the invoice.
    success_url: site + "/success.html?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: site + "/cancel.html",
  };
}

module.exports = { buildLineItems, sessionParams, MAX_QTY };
