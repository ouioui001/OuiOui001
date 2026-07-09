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
3. **Trim** — if both cutouts look unsafe (too much or too little
   removed), the tidily-cropped photo is kept so a cover is never
   destroyed.

The chosen result is composited onto the site's paper colour (#fbfaf7)
so every cover sits seamlessly on the page. If `rembg` isn't installed
the build still runs, using stages 2–3 only.

Commit and push the result if `git status` shows changes.
