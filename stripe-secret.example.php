<?php
/**
 * Copy this file to  stripe-secret.php  (same folder as checkout.php) and
 * paste your Stripe secret key below. stripe-secret.php is git-ignored, so
 * your key is never committed. PHP executes this file, so even if someone
 * requests /stripe-secret.php in a browser they get nothing back.
 *
 * Prefer setting STRIPE_SECRET_KEY as an environment variable if your plan
 * supports it; this file is the simple fallback for shared hosting.
 */
return 'sk_live_or_sk_test_your_key_here';
