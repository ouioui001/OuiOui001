// Storefront configuration.
// checkoutEndpoint is a same-domain path — no key ever goes here.
//   Hostinger (PHP hosting):  "/checkout.php"   ← current
//   Vercel (Node functions):  "/api/checkout"
// Until the backend is set up with your Stripe key, the Checkout button
// reports an error rather than charging — that's expected.
window.STOREFRONT = {
  checkoutEndpoint: "/checkout.php"
};
