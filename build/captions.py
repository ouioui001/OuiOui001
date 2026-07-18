#!/usr/bin/env python3
"""
Generate ready-to-post social captions for every catalogue item.
Writes promo/captions.md. Run:  python3 build/captions.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, "build", "content.json"), encoding="utf-8"))
POSTS = sorted(DATA["posts"], key=lambda x: x["title"].lower())
SITE = "https://www.ouioui001.com"

# keyword -> hashtags, so each caption gets relevant, searchable tags
TAGS = [
    ("yohji", ["#yohjiyamamoto", "#yohji"]),
    ("comme des gar", ["#commedesgarcons", "#cdg", "#reikawakubo"]),
    ("raf simons", ["#rafsimons"]),
    ("margiela", ["#margiela", "#maisonmargiela", "#martinmargiela"]),
    ("undercover", ["#undercover", "#juntakahashi"]),
    ("number (n)ine", ["#numbernine", "#takahiromiyashita"]),
    ("number (n)ine", ["#numbernine"]),
    ("hedi slimane", ["#hedislimane", "#diorhomme"]),
    ("helmut lang", ["#helmutlang"]),
    ("issey miyake", ["#isseymiyake"]),
    ("rick owens", ["#rickowens"]),
    ("vivienne westwood", ["#viviennewestwood"]),
    ("ann demeulemeester", ["#anndemeulemeester"]),
    ("carol christian poell", ["#carolchristianpoell", "#ccp"]),
    ("chrome hearts", ["#chromehearts"]),
    ("hiroshi fujiwara", ["#hiroshifujiwara", "#fragment"]),
    ("takahiromiyashita", ["#thesoloist", "#takahiromiyashita"]),
    ("soloist", ["#thesoloist"]),
    ("balenciaga", ["#balenciaga"]),
    ("gasbook", ["#gasbook"]),
]
BASE_TAGS = ["#ouioui001", "#archivefashion", "#fashionarchive", "#rarebooks",
             "#fashionbook", "#archive"]


def tags_for(title):
    t = title.lower()
    out = []
    for kw, tags in TAGS:
        if kw in t:
            for tag in tags:
                if tag not in out:
                    out.append(tag)
    out += [x for x in BASE_TAGS if x not in out]
    return " ".join(out[:12])


def caption(p):
    url = "{}/books/{}/".format(SITE, p["slug"])
    desc = (p.get("description") or "").strip()
    hook = desc if desc else "A rare piece from the archive."
    # keep the hook to one tidy sentence
    hook = re.split(r"(?<=[.!?])\s", hook)[0].strip()
    return (
        "**{title}**\n\n"
        "{hook}\n\n"
        "Every page scanned and archived — see the full gallery on ouioui001.com "
        "(link in bio) → /books/{slug}/\n\n"
        "{tags}\n"
    ).format(title=p["title"], hook=hook, slug=p["slug"], tags=tags_for(p["title"]))


def main():
    out = ["# OuiOui001 — per-book captions\n",
           "Paste-ready captions for Instagram / TikTok. One per catalogue item.",
           "Swap the order or trim hashtags to taste. Put the site link in your bio.\n",
           "---\n"]
    for p in POSTS:
        out.append(caption(p))
        out.append("---\n")
    path = os.path.join(ROOT, "promo", "captions.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))
    print("Wrote", path, "with", len(POSTS), "captions")


if __name__ == "__main__":
    main()
