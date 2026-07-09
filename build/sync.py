#!/usr/bin/env python3
"""
Refresh build/content.json from the OuiOui001 Sanity dataset, then rebuild.

Workflow for adding new scans:
  1. Upload the images / edit posts in Sanity Studio (as before)
  2. Run:  python3 build/sync.py
  3. Commit and push — GitHub Pages redeploys automatically

Requires no credentials: the dataset is public-read, same as the live site.
"""
import json, os, re, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = "up4mo0bf"
DATASET = "production"
API = "https://{p}.api.sanity.io/v2021-10-21/data/query/{d}?query={q}"


def query(groq):
    url = API.format(p=PROJECT, d=DATASET, q=urllib.parse.quote(groq))
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)["result"]


def ref_to_meta(ref):
    # image-<hash>-<W>x<H>-<ext>  ->  {file, w, h}
    m = re.match(r"image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$", ref)
    if not m:
        raise ValueError("unrecognised asset ref: " + ref)
    return {
        "file": "{}-{}x{}.{}".format(m.group(1), m.group(2), m.group(3), m.group(4)),
        "w": int(m.group(2)),
        "h": int(m.group(3)),
    }


def main():
    posts_raw = query('*[_type=="post"]{...}')
    links_raw = query('*[_type=="link"]{...}')

    posts = []
    for p in posts_raw:
        cover = None
        ref = (p.get("image") or {}).get("asset", {}).get("_ref")
        if ref:
            cover = ref_to_meta(ref)
        gallery = []
        for g in p.get("gallery") or []:
            r = (g.get("asset") or {}).get("_ref")
            if r:
                gallery.append(ref_to_meta(r))
        posts.append({
            "title": (p.get("title") or "").strip(),
            "slug": p["slug"]["current"],
            "date": p.get("date"),
            "description": (p.get("description") or "").strip(),
            "cover": cover or (gallery[0] if gallery else None),
            "gallery": gallery,
        })
    posts.sort(key=lambda x: x["title"].lower())

    links_raw.sort(key=lambda x: x.get("_createdAt", ""))
    links = [
        {"label": l.get("label", ""), "text": l.get("text", ""),
         "to": l.get("to", ""), "target": l.get("target", "_blank")}
        for l in links_raw
    ]

    out = {"posts": posts, "links": links, "projectId": PROJECT, "dataset": DATASET}
    path = os.path.join(ROOT, "build", "content.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
    total = sum(len(p["gallery"]) for p in posts)
    print("Synced {} posts, {} gallery images, {} links -> build/content.json".format(
        len(posts), total, len(links)))

    # regenerate the site with the fresh content
    import subprocess, sys
    subprocess.check_call([sys.executable, os.path.join(ROOT, "build", "build.py")])


if __name__ == "__main__":
    main()
