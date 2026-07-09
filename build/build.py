#!/usr/bin/env python3
"""
Static site generator for the OuiOui001 catalogue & archive.
Reads build/content.json (exported from the site's own Sanity dataset)
and writes faithful static HTML pages to the repo root.

Run:  python3 build/build.py
"""
import json, os, html, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, "build", "content.json"), encoding="utf-8"))
POSTS = DATA["posts"]
LINKS = DATA["links"]

CDN = "https://cdn.sanity.io/images/up4mo0bf/production/"
SITE = "https://www.ouioui001.com"  # canonical origin (no trailing slash)


def esc(s):
    return html.escape(s or "", quote=True)


def cdn(file, params):
    return CDN + file + ("?" + params if params else "")


# ---------------------------------------------------------------- logo
def make_logo(pfx, animate=False):
    """OuiOui wordmark. Unique mask ids per instance (pfx).
    animate=True tags strokable shapes with .draw and fills with .fill-el."""
    dclass = ' class="draw"' if animate else ""
    fclass = ' class="fill-el"' if animate else ""
    m0 = "mask0_" + pfx
    m1 = "mask1_" + pfx
    return (
        '<svg class="wordmark" width="100%" viewBox="0 0 2537 805" fill="none" '
        'xmlns="http://www.w3.org/2000/svg" aria-label="OuiOui001">'
        '<circle{d} cx="339.5" cy="403.5" r="324.5" stroke="currentColor" stroke-width="28"></circle>'
        '<mask id="{m0}" style="mask-type:alpha;" maskUnits="userSpaceOnUse" x="704" y="220" width="500" height="520">'
        '<rect x="704.5" y="220.5" width="499" height="519" fill="#D9D9D9" stroke="currentColor"></rect></mask>'
        '<g mask="url(#{m0})"><path{d} d="M1190 78V490C1190 620.339 1084.34 726 954 726C823.661 726 718 620.339 718 490V78H1190Z" '
        'stroke="currentColor" stroke-width="28"></path></g>'
        '<g><rect{f} x="1230" y="220" width="28" height="502" fill="currentColor"></rect>'
        '<rect{f} x="1230" y="64" width="28" height="79" fill="currentColor"></rect></g>'
        '<circle{d} cx="1619.5" cy="402.5" r="324.5" stroke="currentColor" stroke-width="28"></circle>'
        '<mask id="{m1}" style="mask-type:alpha;" maskUnits="userSpaceOnUse" x="1982" y="221" width="500" height="520">'
        '<rect x="1982.5" y="221.5" width="499" height="519" fill="#D9D9D9" stroke="currentColor"></rect></mask>'
        '<g mask="url(#{m1})"><path{d} d="M2468 79V491C2468 621.339 2362.34 727 2232 727C2101.66 727 1996 621.339 1996 491V79H2468Z" '
        'stroke="currentColor" stroke-width="28"></path></g>'
        '<g><rect{f} x="2508" y="221" width="28" height="502" fill="currentColor"></rect>'
        '<rect{f} x="2508" y="65" width="28" height="79" fill="currentColor"></rect></g>'
        "</svg>"
    ).format(d=dclass, f=fclass, m0=m0, m1=m1)


# ---------------------------------------------------------------- shell
def nav(active, base):
    def a(href, label, key):
        cls = "active" if active == key else ""
        return '<a href="{h}" class="{c}">{l}</a>'.format(h=href, c=cls, l=label)
    return (
        '<nav class="nav">'
        + a(base or "./", "catalogue", "catalogue")
        + '<span class="sep">,&nbsp;</span>'
        + a(base + "archive/", "archive", "archive")
        + '<span class="sep">,&nbsp;</span>'
        + a(base + "information/", "information", "information")
        + "</nav>"
    )


def intro_overlay():
    return '<div class="intro" aria-hidden="true">' + make_logo("intro", animate=True) + "</div>"


def page(title, active, body, base="", description="OuiOui website.", with_intro=True,
         url="/", og_image=None, jsonld=None):
    canonical = SITE + url
    og_img = og_image or (SITE + "/fav-l.png")
    jsonld_tag = (
        '<script type="application/ld+json">' + json.dumps(jsonld, ensure_ascii=False) + "</script>"
        if jsonld else ""
    )
    head = (
        "<!DOCTYPE html><html lang=\"en\"><head>"
        '<meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
        "<title>{title}</title>"
        '<meta name="description" content="{desc}">'
        '<link rel="canonical" href="{canonical}">'
        '<meta name="apple-mobile-web-app-capable" content="yes">'
        '<meta name="mobile-web-app-capable" content="yes">'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
        '<meta property="og:site_name" content="OuiOui001">'
        '<meta property="og:title" content="{title}">'
        '<meta property="og:description" content="{desc}">'
        '<meta property="og:type" content="website">'
        '<meta property="og:url" content="{canonical}">'
        '<meta property="og:image" content="{og_img}">'
        '<meta name="twitter:card" content="summary_large_image">'
        '<meta name="twitter:title" content="{title}">'
        '<meta name="twitter:description" content="{desc}">'
        '<meta name="twitter:image" content="{og_img}">'
        '<link rel="icon" type="image/x-icon" href="{base}favicon.ico">'
        '<link rel="apple-touch-icon" href="{base}fav-l.png">'
        '<link rel="preconnect" href="https://cdn.sanity.io" crossorigin>'
        '<link rel="preload" as="font" type="font/otf" href="{base}assets/fonts/26A1VeeloNeue.otf" crossorigin>'
        '<link rel="stylesheet" href="{base}assets/style.css">'
        # --- Visitor analytics (pending account) -------------------------
        # GoatCounter is privacy-friendly and needs no cookie banner.
        # Create a free account at https://www.goatcounter.com, then replace
        # YOURCODE below and remove the surrounding comment markers to enable:
        # <script data-goatcounter="https://YOURCODE.goatcounter.com/count"
        #         async src="//gc.zgo.at/count.js"></script>
        "{jsonld}"
        "</head><body>"
    ).format(title=esc(title), desc=esc(description), base=base,
             canonical=esc(canonical), og_img=esc(og_img), jsonld=jsonld_tag)
    intro = intro_overlay() if with_intro else ""
    tail = '<script src="{base}assets/app.js" defer></script></body></html>'.format(base=base)
    return head + intro + nav(active, base) + body + tail


# ---------------------------------------------------------------- tiles
def tile(img, group, sizes):
    f = img["file"]
    w, h = img["w"], img["h"]
    src = cdn(f, "w=400&auto=format&q=80")
    srcset = ", ".join([
        cdn(f, "w=200&auto=format&q=80") + " 200w",
        cdn(f, "w=400&auto=format&q=80") + " 400w",
        cdn(f, "w=800&auto=format&q=82") + " 800w",
    ])
    return (
        '<img class="tile" data-file="{f}" data-group="{g}" '
        'src="{src}" srcset="{ss}" sizes="{sizes}" '
        'width="{w}" height="{h}" style="aspect-ratio:{w}/{h};" '
        'loading="lazy" decoding="async" draggable="false" alt="{alt}">'
    ).format(f=f, g=esc(group), src=src, ss=srcset, sizes=sizes, w=w, h=h,
             alt=esc(group))


# ---------------------------------------------------------------- pages
def build_catalogue():
    base = ""  # repo root
    rows = []
    for p in POSTS:
        cover = p["cover"]["file"] if p.get("cover") else ""
        rows.append(
            '<li class="inv-item">'
            '<a class="inv-link" href="{base}books/{slug}/" data-cover="{cover}" data-title="{t}">'
            '<span class="inv-more">(view more)</span>{title}</a></li>'.format(
                base=base, slug=p["slug"], cover=esc(cover), t=esc(p["title"]), title=esc(p["title"])
            )
        )
    body = (
        '<div class="hover-cover"><img alt="" draggable="false"></div>'
        '<main class="catalogue">'
        '<h1 class="inv-count">(inventory {n})</h1>'
        '<ul class="inv-list dimmable">{rows}</ul>'
        '<footer class="foot"><a href="{base}" aria-label="OuiOui001 home">{logo}</a></footer>'
        "</main>"
    ).format(n=len(POSTS), rows="".join(rows), logo=make_logo("catfoot"), base=base or "./")
    cover0 = POSTS[0]["cover"]["file"] if POSTS and POSTS[0].get("cover") else None
    jsonld = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "OuiOui001",
        "url": SITE + "/",
        "description": "OuiOui001 — a catalogue and archive of rare fashion books, "
                       "magazines and printed matter.",
    }
    return page("OuiOui001", "catalogue", body, base=base, url="/",
                description="OuiOui001 — a catalogue and archive of rare fashion books, "
                            "magazines and printed matter. Inventory of %d items." % len(POSTS),
                og_image=cdn(cover0, "w=1200&auto=format") if cover0 else None,
                jsonld=jsonld)


def build_archive():
    base = "../"  # archive/index.html
    secs = []
    for p in POSTS:
        tiles = "".join(
            tile(g, p["slug"], "(max-width:640px) 25vw, (max-width:1024px) 12.5vw, 6.6vw")
            for g in p["gallery"]
        )
        # Estimated rendered height per breakpoint (content-visibility hint):
        # rows * column-width * average aspect ratio, plus room for the title.
        n = len(p["gallery"]) or 1
        avg = sum(g["h"] / g["w"] for g in p["gallery"]) / n if p["gallery"] else 1.0
        def cis(cols, col_vw):
            rows = -(-n // cols)  # ceil
            return "calc({h}vw + 5rem)".format(h=round(rows * col_vw * avg, 1))
        style = "--cis-m:{m};--cis-t:{t};--cis-d:{d}".format(
            m=cis(4, 24.5), t=cis(8, 12.2), d=cis(15, 6.5)
        )
        secs.append(
            '<section style="{style}">'
            '<a class="archive-sec-title" href="{base}books/{slug}/">{title}</a>'
            '<div class="grid archive-grid">{tiles}</div>'
            "</section>".format(style=style, base=base, slug=p["slug"], title=esc(p["title"]), tiles=tiles)
        )
    body = '<main class="archive">' + "".join(secs) + "</main>"
    jsonld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "OuiOui001 — archive",
        "url": SITE + "/archive/",
        "description": "The complete image index of the OuiOui001 collection.",
    }
    return page("OuiOui001 — archive", "archive", body, base=base, url="/archive/",
                description="OuiOui001 archive — the complete image index of every "
                            "book and magazine in the collection.",
                jsonld=jsonld)


def build_information():
    lead = '<span class="lead">oui oui&nbsp;</span>'
    links = []
    for l in LINKS:
        tgt = ' target="_blank" rel="noopener noreferrer"' if l.get("target") == "_blank" else ""
        links.append(
            '<a class="info-link" href="{to}"{tgt}>'
            '<span class="small-label">({label})</span> {text}</a>'.format(
                to=esc(l["to"]), tgt=tgt, label=esc(l["label"]), text=esc(l["text"])
            )
        )
    body = (
        '<main class="information">'
        '<div style="width:100%"><section>'
        '<p class="op-wrp">' + lead + "".join(links) + "</p>"
        "</section></div></main>"
    )
    return page("OuiOui001 — information", "information", body, base="../",
                url="/information/",
                description="OuiOui001 — contact & information.")


def build_book(p):
    slug = p["slug"]
    sizes = "(max-width:640px) 50vw, (max-width:1024px) 25vw, 6.6vw"
    tiles = "".join(tile(g, slug, sizes) for g in p["gallery"])
    desc = p.get("description") or ""
    desc_block = ""
    if desc:
        desc_block = (
            '<p class="book-desc"><span class="small-label">(description)</span> {desc} '
            '<button class="gallery-jump small-label">(view the gallery below)</button></p>'
        ).format(desc=esc(desc))
    else:
        desc_block = (
            '<p class="book-desc">'
            '<button class="gallery-jump small-label">(view the gallery below)</button></p>'
        )
    body = (
        '<main>'
        '<div class="book-head">'
        '<h1 class="book-title"><span class="small-label">(title)</span> {title}</h1>'
        "{desc}"
        "</div>"
        '<div class="book-gallery-wrap">'
        '<div id="gallery" class="grid">{tiles}</div>'
        "</div>"
        "</main>"
    ).format(title=esc(p["title"]), desc=desc_block, tiles=tiles)
    url = "/books/{}/".format(slug)
    cover = p["cover"]["file"] if p.get("cover") else None
    jsonld = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": p["title"],
        "url": SITE + url,
        "description": desc or p["title"],
    }
    if cover:
        jsonld["image"] = cdn(cover, "w=1200&auto=format")
    if p.get("date"):
        jsonld["dateModified"] = p["date"]
    return page(p["title"] + " — OuiOui001", "", body, base="../../",
                url=url,
                og_image=cdn(cover, "w=1200&auto=format") if cover else None,
                jsonld=jsonld,
                description=(desc or p["title"])[:180], with_intro=False)


# ---------------------------------------------------------------- write
def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(content)


def build_sitemap():
    import datetime
    today = datetime.date.today().isoformat()
    entries = [("/", today), ("/archive/", today), ("/information/", today)]
    for p in POSTS:
        entries.append(("/books/{}/".format(p["slug"]), p.get("date") or today))
    urls = "".join(
        "<url><loc>{loc}</loc><lastmod>{mod}</lastmod></url>".format(
            loc=esc(SITE + path), mod=esc(mod)
        )
        for path, mod in entries
    )
    return ('<?xml version="1.0" encoding="UTF-8"?>'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            + urls + "</urlset>")


def build_robots():
    return "User-agent: *\nAllow: /\n\nSitemap: {}/sitemap.xml\n".format(SITE)


def main():
    write("index.html", build_catalogue())
    write("archive/index.html", build_archive())
    write("information/index.html", build_information())
    for p in POSTS:
        write("books/{}/index.html".format(p["slug"]), build_book(p))
    write("sitemap.xml", build_sitemap())
    write("robots.txt", build_robots())
    print("Generated:")
    print("  index.html (catalogue,", len(POSTS), "items)")
    print("  archive/index.html (", sum(len(p["gallery"]) for p in POSTS), "images )")
    print("  information/index.html")
    print("  books/<slug>/index.html x", len(POSTS))
    print("  sitemap.xml ({} URLs) + robots.txt".format(len(POSTS) + 3))


if __name__ == "__main__":
    main()
