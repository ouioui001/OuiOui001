#!/usr/bin/env python3
"""
Download every catalogue image at full original resolution from the Sanity CDN
into a local folder, for a fully-offline archive.

Usage: python3 build/fetch_images.py <dest_dir>
Idempotent: existing, correctly-sized files are skipped, so it can be re-run.
"""
import json, os, sys, time, urllib.request, concurrent.futures

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDN = "https://cdn.sanity.io/images/up4mo0bf/production/"
DEST = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "images")
os.makedirs(DEST, exist_ok=True)

DATA = json.load(open(os.path.join(ROOT, "build", "content.json"), encoding="utf-8"))
files = set()
for p in DATA["posts"]:
    if p.get("cover"):
        files.add(p["cover"]["file"])
    for g in p["gallery"]:
        files.add(g["file"])
files = sorted(files)

done = 0
failed = []
lock = __import__("threading").Lock()
total = len(files)


def fetch(f):
    global done
    out = os.path.join(DEST, f)
    if os.path.exists(out) and os.path.getsize(out) > 0:
        with lock:
            done += 1
        return
    url = CDN + f  # no transform params = the original, highest-quality file
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ouioui-archiver"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            tmp = out + ".part"
            with open(tmp, "wb") as fh:
                fh.write(data)
            os.replace(tmp, out)
            with lock:
                done += 1
                if done % 100 == 0 or done == total:
                    print("downloaded {}/{}".format(done, total), flush=True)
            return
        except Exception as e:
            if attempt == 3:
                with lock:
                    failed.append((f, str(e)))
            else:
                time.sleep(2 ** attempt)


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    list(ex.map(fetch, files))

sz = sum(os.path.getsize(os.path.join(DEST, x)) for x in os.listdir(DEST)
         if os.path.isfile(os.path.join(DEST, x)) and not x.endswith(".part"))
print("COMPLETE: {}/{} files, {:.2f} GB, {} failed".format(
    done, total, sz / 1024 / 1024 / 1024, len(failed)), flush=True)
if failed:
    for f, e in failed[:20]:
        print("FAILED:", f, e, flush=True)
