<?php
/**
 * POST /checkout.php — create a Stripe Checkout Session from the cart.
 *
 * Runs on any standard Hostinger PHP hosting (needs cURL, which is on by
 * default). No Composer/SDK required. Keeps prices server-side and has
 * Stripe email the buyer an invoice PDF + receipt after payment.
 *
 * The secret key is read from (in order):
 *   1) environment variable STRIPE_SECRET_KEY, or
 *   2) a stripe-secret.php file next to this one that `return`s the key.
 * stripe-secret.php is git-ignored — never commit your key.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (getenv('ALLOWED_ORIGIN') ?: '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

// --- secret key + optional storefront URL ---
// stripe-secret.php may `return` either the key string, or an array:
//   ['secret' => 'sk_...', 'site_url' => 'https://your-store.com']
$conf = is_file(__DIR__ . '/stripe-secret.php') ? require __DIR__ . '/stripe-secret.php' : null;
$secret = getenv('STRIPE_SECRET_KEY') ?: '';
$siteOverride = getenv('SITE_URL') ?: '';
if (is_array($conf)) {
    $secret = $secret ?: ($conf['secret'] ?? '');
    $siteOverride = $siteOverride ?: ($conf['site_url'] ?? '');
} elseif (is_string($conf)) {
    $secret = $secret ?: $conf;
}
if (!$secret) { http_response_code(500); echo json_encode(['error' => 'Server not configured (missing Stripe key)']); exit; }

// --- authoritative price catalogue (cents): next to this file, or server/ ---
$catFile = is_file(__DIR__ . '/catalogue.json') ? __DIR__ . '/catalogue.json' : __DIR__ . '/server/catalogue.json';
$catalogue = json_decode(@file_get_contents($catFile), true);
if (!is_array($catalogue)) { http_response_code(500); echo json_encode(['error' => 'Catalogue unavailable']); exit; }

// --- cart from request ---
$body = json_decode(file_get_contents('php://input'), true);
$cart = (is_array($body) && isset($body['cart']) && is_array($body['cart'])) ? $body['cart'] : [];

// --- build Stripe line items (prices come only from the catalogue) ---
$params = [];
$i = 0;
foreach ($cart as $id => $qty) {
    $id = (string) $id;
    if (!isset($catalogue[$id])) continue;
    $q = (int) $qty;
    if ($q < 1) continue;
    if ($q > 10) $q = 10;
    $p = $catalogue[$id];
    $params["line_items[$i][quantity]"] = $q;
    $params["line_items[$i][price_data][currency]"] = $p['currency'] ?? 'usd';
    $params["line_items[$i][price_data][unit_amount]"] = (int) $p['amount'];
    $params["line_items[$i][price_data][product_data][name]"] = $p['title'];
    $params["line_items[$i][price_data][product_data][metadata][sku]"] = $id;
    $i++;
}
if ($i === 0) { http_response_code(400); echo json_encode(['error' => 'Cart is empty or contains no valid items']); exit; }

// --- redirect URLs (derived from the request unless SITE_URL is set) ---
$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) $proto = explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO'])[0];
$site = getenv('SITE_URL') ?: ($proto . '://' . ($_SERVER['HTTP_HOST'] ?? ''));
$site = rtrim($site, '/');

$params['mode'] = 'payment';
$params['success_url'] = $site . '/success.html?session_id={CHECKOUT_SESSION_ID}';
$params['cancel_url'] = $site . '/cancel.html';
$params['customer_creation'] = 'always';
$params['billing_address_collection'] = 'auto';
$params['phone_number_collection[enabled]'] = 'true';

$countries = getenv('SHIP_COUNTRIES')
    ? array_filter(array_map('trim', explode(',', strtoupper(getenv('SHIP_COUNTRIES')))))
    : ['US','CA','GB','AU','JP','DE','FR','IT','ES','NL','SE','NO','DK','IE','NZ','SG','HK','KR'];
foreach (array_values($countries) as $k => $c) {
    $params["shipping_address_collection[allowed_countries][$k]"] = $c;
}

$shop = getenv('SHOP_NAME') ?: 'HARDCPY';
$params['invoice_creation[enabled]'] = 'true';
$params['invoice_creation[invoice_data][description]'] = $shop . ' — order';
$params['invoice_creation[invoice_data][footer]'] = 'Thank you for supporting an independent archive. All items are authentic and one-of-one.';

// --- call Stripe (STRIPE_API_BASE override is for local testing only) ---
$base = getenv('STRIPE_API_BASE') ?: 'https://api.stripe.com';
$ch = curl_init(rtrim($base, '/') . '/v1/checkout/sessions');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_USERPWD => $secret . ':',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS => http_build_query($params),
    CURLOPT_TIMEOUT => 30,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($resp === false) { http_response_code(502); echo json_encode(['error' => 'Could not reach Stripe. Please try again.']); exit; }
$data = json_decode($resp, true);
if ($code >= 200 && $code < 300 && !empty($data['url'])) {
    echo json_encode(['url' => $data['url']]);
} else {
    error_log('Stripe checkout error: ' . $resp);
    http_response_code(500);
    echo json_encode(['error' => 'Could not start checkout. Please try again.']);
}
