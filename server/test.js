// Offline unit tests for the checkout helpers (no Stripe / network).
const assert = require("assert");
const { buildLineItems, sessionParams, MAX_QTY } = require("./lib/checkout");
const catalogue = require("./catalogue.json");

const anyId = Object.keys(catalogue)[0];
const anyPrice = catalogue[anyId].amount;

// prices come from the server catalogue, never the client
let li = buildLineItems({ [anyId]: 2 }, catalogue);
assert.strictEqual(li.length, 1);
assert.strictEqual(li[0].quantity, 2);
assert.strictEqual(li[0].price_data.unit_amount, anyPrice);
assert.strictEqual(li[0].price_data.product_data.metadata.sku, String(anyId));

// a client-sent price is ignored (no price field is even read)
li = buildLineItems({ [anyId]: 1, price: 1 }, catalogue);
assert.strictEqual(li.length, 1);

// unknown ids, zero/negative/garbage quantities are dropped
assert.strictEqual(buildLineItems({ "999999": 3 }, catalogue).length, 0);
assert.strictEqual(buildLineItems({ [anyId]: 0 }, catalogue).length, 0);
assert.strictEqual(buildLineItems({ [anyId]: -4 }, catalogue).length, 0);
assert.strictEqual(buildLineItems({ [anyId]: "x" }, catalogue).length, 0);
assert.strictEqual(buildLineItems(null, catalogue).length, 0);

// quantity is capped
assert.strictEqual(buildLineItems({ [anyId]: 999 }, catalogue)[0].quantity, MAX_QTY);

// session params enable the emailed invoice and collect email + shipping
const p = sessionParams(buildLineItems({ [anyId]: 1 }, catalogue), {
  siteUrl: "https://shop.example.com/", shopName: "OuiOui Prints",
});
assert.strictEqual(p.mode, "payment");
assert.strictEqual(p.invoice_creation.enabled, true);
assert.strictEqual(p.customer_creation, "always");
assert.ok(p.shipping_address_collection.allowed_countries.length > 0);
assert.strictEqual(p.success_url, "https://shop.example.com/success.html?session_id={CHECKOUT_SESSION_ID}");
assert.strictEqual(p.cancel_url, "https://shop.example.com/cancel.html");

console.log("all checkout tests passed (" + Object.keys(catalogue).length + " priced items in catalogue)");
