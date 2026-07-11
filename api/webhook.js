// POST /api/webhook — Stripe webhook (optional).
// Stripe already emails the buyer the invoice (PDF) + receipt because the
// Checkout Session enables invoice_creation. This is where YOU learn of a
// sale and can mark the item sold or notify yourself.
//
// Env vars:  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…)
// Needs the raw request body to verify the signature (bodyParser off).

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
    try {
      const items = await stripe.checkout.sessions.listLineItems(s.id, { limit: 100 });
      const skus = items.data.map((li) => li.description || "").join(" | ");
      console.log("PAID ORDER", s.id, s.customer_details && s.customer_details.email, "$" + (s.amount_total / 100), "::", skus);
    } catch (e) {
      console.log("PAID ORDER", s.id, "(could not list items)");
    }
    // TODO (optional): email/Slack yourself here, or mark items sold.
  }

  return res.status(200).json({ received: true });
};
