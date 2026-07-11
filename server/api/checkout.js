// POST /api/checkout — create a Stripe Checkout Session from a cart.
// Deploy target: Vercel (Node serverless). Netlify/Cloudflare notes in README.
//
// Request body:  { "cart": { "<id>": <qty>, ... } }
// Response:      { "url": "https://checkout.stripe.com/..." }
//
// Env vars required:
//   STRIPE_SECRET_KEY   your Stripe secret key (sk_live_… / sk_test_…)
//   SITE_URL            public URL of the storefront (for success/cancel)
// Optional:
//   SHOP_NAME           shown on the invoice (default "OuiOui Prints")
//   ALLOWED_ORIGIN      CORS origin allowed to call this (default SITE_URL)
//   SHIP_COUNTRIES      comma-separated ISO country codes to allow

const Stripe = require("stripe");
const catalogue = require("../catalogue.json");
const { buildLineItems, sessionParams } = require("../lib/checkout");

function setCors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  const allowOrigin = process.env.ALLOWED_ORIGIN || process.env.SITE_URL || "*";
  setCors(res, allowOrigin);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: "Server not configured (missing STRIPE_SECRET_KEY)" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const lineItems = buildLineItems(body.cart, catalogue);
    if (!lineItems.length) return res.status(400).json({ error: "Cart is empty or contains no valid items" });

    const stripe = Stripe(key);
    const session = await stripe.checkout.sessions.create(sessionParams(lineItems, {
      siteUrl: process.env.SITE_URL || "",
      shopName: process.env.SHOP_NAME || "OuiOui Prints",
      allowedCountries: (process.env.SHIP_COUNTRIES || "")
        .split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    }));

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err && err.message);
    return res.status(500).json({ error: "Could not start checkout. Please try again." });
  }
};
