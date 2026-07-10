# Inventory sync

Regenerates the shop from the live Depop listings (@ouiouiprints):

```sh
npm i playwright-core                 # once per environment
pip install pillow numpy scipy rembg  # once per environment
node tools/scrape.js /tmp/api.json
python3 tools/build_data.py /tmp/api.json
```

What it does:

1. `scrape.js` opens the Depop shop in headless Chromium and captures the
   product API responses while scrolling the full catalogue.
2. `build_data.py` filters to book/magazine/catalog listings only
   (excludes framed prints, posters, everything else), then for each new
   item removes the photo background so the cover is just the book, prunes
   covers for delisted items, and rewrites `data/books.js`.

### Background removal

Each cover runs through a best-result-wins cascade:

1. **ML segmentation** (`rembg` / u2net) — cuts the book out of any
   background. The u2net model is fetched once into `~/.u2net` from a
   HuggingFace mirror (the upstream GitHub release is blocked on some
   networks).
2. **Border-colour key** — for the common case of a light, uniform
   backdrop, removes it by colour distance from the frame edge.

A cutout is only accepted when it forms a filled, book-shaped rectangle
(this rejects the failure mode where segmentation lifts the person off a
full-bleed cover). **Listings without a clean cutout are excluded from
the catalogue** so the site stays clean and presentable. Covers are cut
from the 1280px source and saved at quality 92.

Commit and push the result if `git status` shows changes.
