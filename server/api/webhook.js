// POST /api/webhook — Stripe webhook (optional but recommended).
//
// Stripe already emails the buyer the invoice (PDF) and a receipt because
// the Checkout Session enables invoice_creation. This endpoint is where
// YOU get notified of a sale and can mark the item sold. It verifies the
// Stripe signature, then logs the order — extend the marked section to
// send yourself an email/Slack, or flag the listing as sold.
//
// Env vars:
//   STRIPE_SECRET_KEY       your Stripe secret key
//   STRIPE_WEBHOOK_SECRET   the signing secret from the Stripe webhook (whsec_…)
//
// Vercel note: this handler needs the RAW body to verify the signature.
// The `config` export below disables body parsing.

const Stripe = require("stripe");

module.exports.config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whSecret) return res.status(500).send("Webhook not configured");

  const stripe = Stripe(key);
  let event;
  try {
    const raw = await readRaw(req);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], whSecret);
  } catch (err) {
    console.error("webhook signature check failed:", err && err.message);
    return res.status(400).send("Invalid signature");
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    // ---- new paid order -------------------------------------------------
    // s.customer_details.email  → buyer email
    // s.amount_total            → total in cents
    // s.invoice                 → Stripe invoice id (PDF emailed to buyer)
    // Retrieve line items for the SKUs that sold:
    try {
      const items = await stripe.checkout.sessions.listLineItems(s.id, { limit: 100 });
      const skus = items.data.map((li) => (li.description || "")).join(" | ");
      console.log("PAID ORDER", s.id, s.customer_details && s.customer_details.email, "$" + (s.amount_total / 100), "::", skus);
    } catch (e) {
      console.log("PAID ORDER", s.id, "(could not list items)");
    }
    // TODO (optional): email/Slack yourself here, or mark items sold.
    // --------------------------------------------------------------------
  }

  return res.status(200).json({ received: true });
};
