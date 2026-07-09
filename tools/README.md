# Inventory sync

Regenerates the shop from the live Depop listings (@ouiouiprints):

```sh
npm i playwright-core            # once per environment
pip install pillow numpy         # once per environment
node tools/scrape.js /tmp/api.json
python3 tools/build_data.py /tmp/api.json
```

What it does:

1. `scrape.js` opens the Depop shop in headless Chromium and captures the
   product API responses while scrolling the full catalogue.
2. `build_data.py` filters to book/magazine/catalog listings only
   (excludes framed prints, posters, everything else), downloads and
   background-trims covers for new items into `assets/covers/`, deletes
   covers for delisted items, and rewrites `data/books.js`.

Commit and push the result if `git status` shows changes.
