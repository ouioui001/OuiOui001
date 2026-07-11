// Storefront configuration.
// The checkout function ships in /api and deploys with the site (Vercel),
// so this same-domain path works once deployed — no key goes here, ever.
// On a host without the function, the Checkout button will report an error
// instead of charging; that's expected until you deploy.
window.STOREFRONT = {
  checkoutEndpoint: "/api/checkout"
};
