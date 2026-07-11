<?php
/**
 * Copy this file to  stripe-secret.php  (next to checkout.php on Hostinger)
 * and fill in your key. stripe-secret.php is git-ignored — never commit it.
 * PHP executes this file, so requesting it in a browser returns nothing.
 *
 * `site_url` is where your STOREFRONT lives (e.g. https://hardcpy.shop) —
 * Stripe sends the buyer back there after paying. Set it when the payment
 * file is on a different host than the store.
 */
return [
    'secret'   => 'sk_live_or_sk_test_your_key_here',
    'site_url' => 'https://hardcpy.shop',
];
