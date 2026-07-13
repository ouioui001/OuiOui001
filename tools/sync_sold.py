#!/usr/bin/env python3
"""Sync data/sold.js from Stripe.

Every listing sells through its own Stripe payment link that allows exactly
one completed purchase (restrictions.completed_sessions.limit = 1). This
script lists the account's payment links and marks a listing SOLD when its
link has used up that allowance (or was deactivated by hand).

Only links whose URL appears in data/paylinks.js are considered, so older
retired links with the same sku metadata can never mis-mark a listing.

Auth: STRIPE_KEY env var — use a RESTRICTED key with only
"Payment Links: Read" permission (create at dashboard.stripe.com/apikeys).
Run by .github/workflows/sync-sold.yml; safe to run by hand too.
"""
import json, os, re, sys, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.environ.get("STRIPE_API_BASE", "https://api.stripe.com")

key = os.environ.get("STRIPE_KEY", "")
if not key:
    sys.exit("STRIPE_KEY is not set — add the STRIPE_RESTRICTED_KEY repo secret")

def get(url):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

# the current live payment links (url -> sku)
raw = open(os.path.join(REPO, "data", "paylinks.js")).read()
paylinks = json.loads(raw[raw.index("{"):raw.rindex("}") + 1])
live_urls = {url: int(sku) for sku, url in paylinks.items()}

sold = set()
url = API + "/v1/payment_links?limit=100"
while True:
    page = get(url)
    for pl in page.get("data", []):
        sku = live_urls.get(pl.get("url"))
        if sku is None:
            continue                      # not one of the site's live links
        done = (pl.get("restrictions") or {}).get("completed_sessions") or {}
        used_up = done.get("limit") and done.get("count", 0) >= done["limit"]
        if used_up or not pl.get("active", True):
            sold.add(sku)
    if not page.get("has_more"):
        break
    url = (API + "/v1/payment_links?limit=100&starting_after=" + page["data"][-1]["id"])

ids = sorted(sold)
path = os.path.join(REPO, "data", "sold.js")
src = open(path).read()
out = re.sub(r"const SOLD = \[[^\]]*\];", "const SOLD = " + json.dumps(ids) + ";", src)
if out != src:
    open(path, "w").write(out)
    print("updated data/sold.js ->", ids or "[]")
else:
    print("no change; sold listings:", ids or "[]")
