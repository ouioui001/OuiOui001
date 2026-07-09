# OuiOui001

A faithful static rebuild of [www.ouioui001.com](https://www.ouioui001.com) —
a pure catalogue & archive of the collection. No commerce, no cart: catalogue
and archive only.

## What's here

Plain, dependency-free static HTML/CSS/JS. Every page is pre-generated, so it
hosts anywhere (GitHub Pages, Netlify, any static host) and loads fast.

```
index.html               → catalogue (the inventory list)
archive/index.html       → archive (the full image index, every gallery)
information/index.html    → contact & links
books/<slug>/index.html   → one page per item (34), with its full gallery
assets/
  style.css              → all styling
  app.js                 → intro animation, hover preview, lightbox, protection
  fonts/                 → 26A1VeeloNeue (the site typeface)
build/
  build.py               → the generator
  content.json           → content exported from the site's Sanity dataset
```

## Features

- **Intro animation** — on first visit each session, the OuiOui wordmark draws
  itself on a white screen, then the site reveals.
- **Faithful design** — same text, same typeface, same minimal layout as the
  original.
- **Full-resolution photos** — images are served from the same Sanity CDN as the
  original, with responsive `srcset` for fast loading and the native
  full-resolution file shown when zoomed.
- **Clickable zoom** — every photo, in the archive and in every item's gallery,
  opens in a lightbox with scroll / pinch zoom, drag to pan, arrow-key / swipe
  navigation, and esc / tap to close.
- **Mobile-first & performant** — responsive grids, lazy-loaded images,
  `content-visibility` on the archive so 2,000+ images stay smooth.
- **Image protection** — right-click save, drag-out, and long-press save are
  blocked on all images.

## Regenerating

Edit `build/content.json` (or re-export it from Sanity) and run:

```bash
python3 build/build.py
```

## Visitor analytics

Not yet wired in — it needs an account first. A privacy-friendly
[GoatCounter](https://www.goatcounter.com) snippet placeholder is noted in
`build/build.py` (in `page()`); create the account, drop in the code, and
rebuild to enable it.
