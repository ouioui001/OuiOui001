#!/usr/bin/env python3
"""Inventory build for the OuiOui Prints book shop.

Reads the API payloads captured by tools/scrape.js, keeps only the
book/magazine/catalog listings (Depop category 27, minus posters),
downloads and background-trims any new cover photos, prunes covers for
delisted items, and regenerates data/books.js.

Usage: python3 tools/build_data.py <api.json>
Requires: pillow, numpy.
"""
import json, os, re, sys, urllib.request, concurrent.futures
import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS = os.path.join(REPO, "assets", "covers")
os.makedirs(COVERS, exist_ok=True)

api_path = sys.argv[1] if len(sys.argv) > 1 else "api.json"
payloads = json.load(open(api_path))

seen = {}
for p in payloads:
    if "/products/" not in p["url"] or "filteredProducts" in p["url"]:
        continue
    for prod in p["json"]["products"]:
        seen[prod["id"]] = prod

BOOK_CATEGORY = 27
books = [
    p for p in seen.values()
    if p["category_id"] == BOOK_CATEGORY
    and "poster" not in p["description"].split("\n")[0].lower()
]
books.sort(key=lambda b: -b["id"])  # newest first
if len(books) < 50:
    sys.exit(f"only {len(books)} books captured — scrape looks incomplete, aborting")

MAG_RE = re.compile(r"magazine|magazin|vogue japan|i-d magazine", re.I)
CAT_RE = re.compile(r"catalog|catalogue|look ?book|lookbook|pamphlet", re.I)

TOPIC_RULES = [
    ("Fashion", re.compile(r"yohji|yamamoto|margiela|maison|comme des|kawakubo|chanel|herm[eè]s|dior|supreme|bape|bathing ape|kapital|issey|miyake|acne|c[eé]line|saint laurent|vivienne|westwood|raf simons|undercover|takahashi|stussy|st[uü]ssy|prada|balenciaga|helmut lang|jil sander|gaultier|tom ford|dries van noten|lemaire|kate moss|hedi slimane|fashion|uniqlo|neighborhood|tomorrowland|mihara|groundy|mm6|y's|dressstudy|kimono|hanatsubaki|le carr[eé]|joaillerie|kamali|street", re.I)),
    ("Art", re.compile(r"\bart\b|nara|yoshitomo|basquiat|warhol|rothko|murakami|exhibition|barragan|judd|aya takano|illustration|eizendo|hangado|sotheby|auction|museum|gallery", re.I)),
    ("Photography", re.compile(r"photo|mcginley|moriyama|araki|kawauchi|richardson|amato|klein|troost|schnabel", re.I)),
    ("Anime & Manga", re.compile(r"akira|evangelion|otomo|kodansha|manga|anime", re.I)),
    ("Music", re.compile(r"punk|clash|patti smith|rockin|hendrix|doherty|yung lean", re.I)),
]


def classify(title):
    if MAG_RE.search(title):
        kind = "Magazines"
    elif CAT_RE.search(title):
        kind = "Catalogs"
    else:
        kind = "Books"
    return kind, [name for name, rx in TOPIC_RULES if rx.search(title)]


def price_of(b):
    p = b["pricing"]
    node = p.get(p.get("final_price_key", "original_price")) or p["original_price"]
    return (
        node["price_breakdown"]["price"]["amount"],
        p.get("is_reduced", False),
        p["original_price"]["price_breakdown"]["price"]["amount"],
    )


def trim_cover(img, pad_frac=0.04):
    """Trim the near-uniform photo background using border statistics."""
    arr = np.asarray(img.convert("RGB"), dtype=np.int16)
    h, w, _ = arr.shape
    border = np.concatenate([
        arr[0:6].reshape(-1, 3), arr[-6:].reshape(-1, 3),
        arr[:, 0:6].reshape(-1, 3), arr[:, -6:].reshape(-1, 3),
    ])
    bg = np.median(border, axis=0)
    dist = np.abs(arr - bg).sum(axis=2)
    ys, xs = np.where(dist > 48)
    if len(ys) == 0:
        return img
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    if (y1 - y0) * (x1 - x0) < 0.20 * h * w:  # trim collapsed — keep original
        return img
    pad = int(max(h, w) * pad_frac)
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))


def process(b):
    out = os.path.join(COVERS, f"{b['id']}.jpg")
    if not os.path.exists(out):
        src = b["preview"].get("960") or b["preview"]["640"]
        tmp = out + ".tmp"
        urllib.request.urlretrieve(src, tmp)
        img = trim_cover(Image.open(tmp))
        img.thumbnail((900, 900), Image.LANCZOS)
        img.convert("RGB").save(out, "JPEG", quality=84, optimize=True)
        os.remove(tmp)


records = []
for b in books:
    lines = [l.strip() for l in b["description"].split("\n")]
    title = re.sub(r"\s+", " ", lines[0]).strip().strip("-–— ")
    tags = " ".join(l for l in lines[1:] if l.startswith("#"))
    kind, topics = classify(title + " " + tags)
    price, reduced, orig = price_of(b)
    ship = b["pricing"].get("national_shipping_cost")
    records.append({
        "id": b["id"],
        "title": title,
        "kind": kind,
        "topics": topics,
        "price": price,
        "reduced": reduced,
        "originalPrice": orig if reduced else None,
        "shipping": ship["price_breakdown"]["price"]["amount"] if ship else None,
        "depopUrl": f"https://www.depop.com/products/{b['slug']}/",
        "cover": f"assets/covers/{b['id']}.jpg",
        "photos": [pic.get("960") or pic.get("640") for pic in b["pictures"]],
        "details": [l for l in lines[1:] if l and not l.startswith("#")],
    })

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    list(ex.map(process, books))

# prune covers of delisted / sold items
keep = {f"{b['id']}.jpg" for b in books}
for f in os.listdir(COVERS):
    if f.endswith(".jpg") and f not in keep:
        os.remove(os.path.join(COVERS, f))
        print("pruned", f)

js = ("// OuiOui Prints — book catalogue generated from the live Depop shop\n"
      "// (@ouiouiprints). Regenerate with tools/; do not edit by hand.\n"
      "const BOOKS = " + json.dumps(records, ensure_ascii=False, indent=1) + ";\n")
with open(os.path.join(REPO, "data", "books.js"), "w") as f:
    f.write(js)
print("wrote data/books.js with", len(records), "books")
