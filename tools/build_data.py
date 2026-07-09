#!/usr/bin/env python3
"""Inventory build for the OuiOui Prints book shop.

Reads the API payloads captured by tools/scrape.js, keeps only the
book/magazine/catalog listings (Depop category 27, minus posters),
removes the photo background so each cover is just the book, prunes
covers for delisted items, and regenerates data/books.js.

Background removal is a three-stage cascade, best result wins:
  1. ML segmentation (rembg / u2net) — handles books on any background.
  2. Border-colour key — for the common case of a light, uniform backdrop.
  3. Keep the tidily-trimmed photo — last resort, so a cover is never
     destroyed by an over-aggressive cutout.
The chosen result is composited onto the site's paper colour so every
cover sits seamlessly on the page.

Usage: python3 tools/build_data.py <api.json>
Requires: pillow, numpy, scipy, rembg (optional — degrades to trim-only).
"""
import json, os, re, sys, urllib.request, concurrent.futures
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS = os.path.join(REPO, "assets", "covers")
os.makedirs(COVERS, exist_ok=True)
PAPER = (251, 250, 247)

# ---------- optional ML background remover ----------
# The u2net model is fetched from a HuggingFace mirror (the upstream GitHub
# release is blocked on some networks) into ~/.u2net on first run.
_SESSION = None
def ml_session():
    global _SESSION
    if _SESSION is not None:
        return _SESSION or None
    try:
        from rembg import new_session
        home = os.path.expanduser("~/.u2net")
        os.makedirs(home, exist_ok=True)
        model = os.path.join(home, "u2net.onnx")
        if not os.path.exists(model):
            url = "https://huggingface.co/tomjackson2023/rembg/resolve/main/u2net.onnx"
            urllib.request.urlretrieve(url, model)
        _SESSION = new_session("u2net")
    except Exception as e:
        print("ML background remover unavailable, using trim fallback:", e)
        _SESSION = False
    return _SESSION or None


def _clean_mask(m):
    if m.sum() == 0:
        return None
    m = ndimage.binary_fill_holes(m)
    lbl, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
        m = lbl == (int(np.argmax(sizes)) + 1)
    return m


def _accept(mask, area):
    """Only accept a cutout that is a filled, roughly rectangular block —
    a book cover. This rejects the common failure where segmentation lifts
    the *subject* off a full-bleed cover (a person-shaped silhouette) or
    slices the cover down to a sliver."""
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return False
    bh, bw = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
    barea = bh * bw
    frac = mask.sum() / area
    if frac < 0.22 or frac > 0.985:
        return False
    if barea < 0.33 * area:                 # sliced too small
        return False
    if mask.sum() / barea < 0.86:           # not a filled rectangle
        return False
    if bh / bw < 0.45 or bh / bw > 2.6:     # implausible book aspect
        return False
    return True


def _to_rgba(im, mask):
    mask = ndimage.binary_erosion(mask, iterations=1)   # shave light fringe
    alpha = Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.5))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def ml_cutout(im):
    sess = ml_session()
    if not sess:
        return None
    from rembg import remove
    area = im.width * im.height
    a = np.asarray(remove(im.convert("RGBA"), session=sess).split()[-1])
    m = _clean_mask(a > 128)
    if m is None or not _accept(m, area):
        return None
    return _to_rgba(im, m)


def key_cutout(im):
    """Remove a light, uniform background by colour distance from the border."""
    arr = np.asarray(im.convert("RGB")).astype(int)
    border = np.concatenate([
        arr[0:6].reshape(-1, 3), arr[-6:].reshape(-1, 3),
        arr[:, 0:6].reshape(-1, 3), arr[:, -6:].reshape(-1, 3),
    ])
    bg = np.median(border, axis=0)
    if bg.mean() < 165 or border.std(axis=0).mean() > 34:   # only clean, light backdrops
        return None
    m = _clean_mask(np.abs(arr - bg).sum(axis=2) > 42)
    if m is None or not _accept(m, arr.shape[0] * arr.shape[1]):
        return None
    return _to_rgba(im, m)


def trim(im):
    """Crop to the content bounding box; no transparency (last resort)."""
    arr = np.asarray(im.convert("RGB"), dtype=np.int16)
    h, w, _ = arr.shape
    border = np.concatenate([arr[0:6].reshape(-1, 3), arr[-6:].reshape(-1, 3),
                             arr[:, 0:6].reshape(-1, 3), arr[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    ys, xs = np.where(np.abs(arr - bg).sum(axis=2) > 48)
    if len(ys) == 0:
        return im.convert("RGBA")
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    if (y1 - y0) * (x1 - x0) < 0.20 * h * w:
        return im.convert("RGBA")
    p = int(max(h, w) * 0.04)
    return im.convert("RGBA").crop((max(0, x0 - p), max(0, y0 - p), min(w, x1 + p), min(h, y1 + p)))


def make_cover(src_path):
    im = Image.open(src_path)
    out = ml_cutout(im) or key_cutout(im) or trim(im)
    bg = Image.new("RGBA", out.size, PAPER + (255,))
    im2 = Image.alpha_composite(bg, out).convert("RGB")
    im2.thumbnail((900, 900), Image.LANCZOS)
    return im2

# ---------- catalogue ----------
api_path = sys.argv[1] if len(sys.argv) > 1 else "api.json"
payloads = json.load(open(api_path))
seen = {}
for p in payloads:
    if "/products/" not in p["url"] or "filteredProducts" in p["url"]:
        continue
    for prod in p["json"]["products"]:
        seen[prod["id"]] = prod

books = [p for p in seen.values()
         if p["category_id"] == 27
         and "poster" not in p["description"].split("\n")[0].lower()]
books.sort(key=lambda b: -b["id"])
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
    kind = "Magazines" if MAG_RE.search(title) else "Catalogs" if CAT_RE.search(title) else "Books"
    return kind, [n for n, rx in TOPIC_RULES if rx.search(title)]

def price_of(b):
    p = b["pricing"]
    node = p.get(p.get("final_price_key", "original_price")) or p["original_price"]
    return (node["price_breakdown"]["price"]["amount"], p.get("is_reduced", False),
            p["original_price"]["price_breakdown"]["price"]["amount"])

def process(b):
    out = os.path.join(COVERS, f"{b['id']}.jpg")
    if not os.path.exists(out):
        src = b["preview"].get("960") or b["preview"]["640"]
        tmp = out + ".src"
        urllib.request.urlretrieve(src, tmp)
        make_cover(tmp).save(out, "JPEG", quality=86, optimize=True)
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
        "id": b["id"], "title": title, "kind": kind, "topics": topics,
        "price": price, "reduced": reduced, "originalPrice": orig if reduced else None,
        "shipping": ship["price_breakdown"]["price"]["amount"] if ship else None,
        "depopUrl": f"https://www.depop.com/products/{b['slug']}/",
        "cover": f"assets/covers/{b['id']}.jpg",
        "photos": [pic.get("960") or pic.get("640") for pic in b["pictures"]],
        "details": [l for l in lines[1:] if l and not l.startswith("#")],
    })

# ML inference isn't thread-safe across the shared session; download in
# parallel is fine but keep cover generation sequential for stability.
for b in books:
    process(b)

keep = {f"{b['id']}.jpg" for b in books}
for f in os.listdir(COVERS):
    if f not in keep and (f.endswith(".jpg") or f.endswith(".png")):
        os.remove(os.path.join(COVERS, f))
        print("pruned", f)

js = ("// OuiOui Prints — book catalogue generated from the live Depop shop.\n"
      "// Regenerate with tools/; do not edit by hand.\n"
      "const BOOKS = " + json.dumps(records, ensure_ascii=False, indent=1) + ";\n")
with open(os.path.join(REPO, "data", "books.js"), "w") as f:
    f.write(js)
print("wrote data/books.js with", len(records), "books")
