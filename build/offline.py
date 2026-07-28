#!/usr/bin/env python3
"""
Assemble a fully-offline archive of the site in <pkg_dir>.

<pkg_dir> must already contain an images/ folder of the original files
(see fetch_images.py). This copies the source + assets in, builds the site
with OFFLINE=1 (local image paths + file://-openable links), and writes an
OFFLINE-README.txt.

Usage:
  python3 build/fetch_images.py  <pkg>/images
  python3 build/offline.py       <pkg>
"""
import os, sys, shutil, subprocess

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.abspath(sys.argv[1])
assert os.path.isdir(os.path.join(PKG, "images")), "images/ folder missing in " + PKG

# 1. copy the source tree needed to view + rebuild
for item in ["build", "assets", "favicon.ico", "fav-l.png",
             "README.md", "PROMOTION.md", "promo"]:
    s = os.path.join(SRC, item)
    d = os.path.join(PKG, item)
    if os.path.isdir(s):
        shutil.copytree(s, d, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    elif os.path.exists(s):
        shutil.copy2(s, d)

# 2. build the offline site into PKG (ROOT of the copied build.py is PKG)
env = dict(os.environ)
env["OFFLINE"] = "1"
subprocess.check_call([sys.executable, os.path.join(PKG, "build", "build.py")], env=env)

# 3. how-to note
readme = """OuiOui001 — fully offline archive
=================================

This folder is a complete, self-contained copy of ouioui001.com with every
image stored locally at full original resolution. No internet required.

TO VIEW
  Open  index.html  in any web browser (double-click it).
  Browse the catalogue, archive, and every book gallery. Click any photo to
  zoom to the full-resolution local file.

WHAT'S INSIDE
  index.html, archive/, information/, books/   the site (offline build)
  images/                                       all original photos (full res)
  assets/                                       styles, script, fonts
  build/                                        the generator + your content
    build.py        regenerate the site
    content.json    all catalogue data (titles, descriptions, image refs)
    sync.py         re-pull latest content from Sanity (needs internet)
    fetch_images.py re-download all originals (needs internet)
    offline.py      rebuild this offline package
  README.md, PROMOTION.md, promo/captions.md

TO REBUILD THE ONLINE (CDN-backed) SITE
  python3 build/build.py

TO REBUILD THIS OFFLINE PACKAGE FROM SCRATCH (needs internet)
  python3 build/fetch_images.py images
  python3 build/offline.py .

Only Python 3 is required. Nothing else to install.
"""
with open(os.path.join(PKG, "OFFLINE-README.txt"), "w", encoding="utf-8") as fh:
    fh.write(readme)

# count
n_imgs = len([x for x in os.listdir(os.path.join(PKG, "images"))
              if os.path.isfile(os.path.join(PKG, "images", x))])
print("Offline package assembled at", PKG)
print("  images:", n_imgs)
print("  open index.html to view")
