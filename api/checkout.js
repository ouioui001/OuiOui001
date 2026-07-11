// POST /api/checkout — create a Stripe Checkout Session from a cart.
// Deployed with the site as one Vercel project, so this lives at
// https://<your-site>/api/checkout and needs no CORS or SITE_URL config.
//
// Request body:  { "cart": { "<id>": <qty>, ... } }
// Response:      { "url": "https://checkout.stripe.com/..." }
//
// Required env var:  STRIPE_SECRET_KEY  (sk_live_… or sk_test_…)
// Optional:          SHOP_NAME (invoice label), SITE_URL (override origin),
//                    ALLOWED_ORIGIN (CORS if the site is hosted elsewhere),
//                    SHIP_COUNTRIES (comma-separated ISO codes)

const Stripe = require("stripe");
const catalogue = require("../server/catalogue.json");
const { buildLineItems, sessionParams } = require("../server/lib/checkout");

function originOf(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return proto + "://" + host;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
      siteUrl: originOf(req),
      shopName: process.env.SHOP_NAME || "HARDCPY",
      allowedCountries: (process.env.SHIP_COUNTRIES || "")
        .split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    }));

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err && err.message);
    return res.status(500).json({ error: "Could not start checkout. Please try again." });
  }
};
