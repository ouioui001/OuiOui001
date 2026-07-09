/* OuiOui001 — interactions
   Intro draw animation · catalogue hover preview · gallery lightbox with zoom
   · image download protection. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  var CDN = "https://cdn.sanity.io/images/up4mo0bf/production/";
  function imgURL(file, opts) {
    var q = opts || "";
    return CDN + file + (q ? "?" + q : "");
  }

  /* ============================================================
     1. INTRO — the logo drawing itself, then reveal.
     Plays once per browser session.
     ============================================================ */
  function runIntro() {
    var intro = document.querySelector(".intro");
    if (!intro) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var seen = false;
    try { seen = sessionStorage.getItem("ouioui_intro") === "1"; } catch (e) {}

    if (seen || reduce) {
      intro.classList.add("done");
      window.setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 50);
      return;
    }

    // lock scroll during intro
    document.documentElement.style.overflow = "hidden";

    var strokes = intro.querySelectorAll(".draw");
    var total = strokes.length;
    // Prepare each strokable element for a draw-on effect.
    strokes.forEach(function (el, i) {
      var len;
      try { len = el.getTotalLength(); } catch (e) { len = 1000; }
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      el.style.transition = "stroke-dashoffset 1.1s cubic-bezier(0.65,0,0.35,1)";
      el.style.transitionDelay = (0.08 * i) + "s";
    });

    // force layout then animate
    void intro.offsetWidth;
    window.requestAnimationFrame(function () {
      strokes.forEach(function (el) { el.style.strokeDashoffset = "0"; });
      intro.classList.add("play"); // triggers the "i" fills growing
    });

    function finish() {
      try { sessionStorage.setItem("ouioui_intro", "1"); } catch (e) {}
      intro.classList.add("done");
      document.documentElement.style.overflow = "";
      window.setTimeout(function () {
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }, 650);
    }
    // draw (~1.1s + stagger) + hold, then reveal
    window.setTimeout(finish, 1100 + total * 80 + 450);
    // safety: never trap the user
    window.setTimeout(function () {
      if (document.querySelector(".intro")) finish();
    }, 5000);
  }

  /* ============================================================
     2. CATALOGUE — bottom-right cover preview on hover.
     ============================================================ */
  function catalogueHover() {
    var holder = document.querySelector(".hover-cover");
    if (!holder) return;
    var imgEl = holder.querySelector("img");
    var items = document.querySelectorAll(".inv-link[data-cover]");
    items.forEach(function (a) {
      a.addEventListener("mouseenter", function () {
        var f = a.getAttribute("data-cover");
        if (!f) return;
        imgEl.src = imgURL(f, "w=700&auto=format&q=85");
        imgEl.alt = a.getAttribute("data-title") || "";
        holder.style.opacity = "1";
      });
      a.addEventListener("mouseleave", function () { holder.style.opacity = "0"; });
    });
  }

  /* ============================================================
     3. LIGHTBOX — click any gallery/archive photo to zoom.
        Full-resolution image, pan + wheel/pinch zoom, prev/next,
        keyboard + swipe. Works for every image in every gallery.
     ============================================================ */
  function lightbox() {
    var groups = {}; // groupId -> array of {file, alt}
    var tiles = document.querySelectorAll(".tile[data-file]");
    if (!tiles.length) return;

    tiles.forEach(function (t) {
      var g = t.getAttribute("data-group") || "default";
      if (!groups[g]) groups[g] = [];
      var idx = groups[g].length;
      groups[g].push({ file: t.getAttribute("data-file"), alt: t.getAttribute("alt") || "" });
      t.setAttribute("data-index", idx);
    });

    // build DOM
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML =
      '<div class="lb-stage"><img class="lb-img" alt=""></div>' +
      '<span class="lb-count"></span>' +
      '<button class="lb-btn lb-close" aria-label="Close">(close)</button>' +
      '<button class="lb-btn lb-prev" aria-label="Previous">&#8592;</button>' +
      '<button class="lb-btn lb-next" aria-label="Next">&#8594;</button>' +
      '<div class="lb-hint">scroll or pinch to zoom · drag to pan · &#8592; &#8594; to browse · esc to close</div>';
    document.body.appendChild(lb);

    var img = lb.querySelector(".lb-img");
    var stage = lb.querySelector(".lb-stage");
    var countEl = lb.querySelector(".lb-count");
    var curGroup = null, curIndex = 0;
    var scale = 1, tx = 0, ty = 0;
    var MIN = 1, MAX = 6;

    function apply() {
      img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
    }
    function resetView() { scale = 1; tx = 0; ty = 0; apply(); }

    function show(group, index) {
      var arr = groups[group];
      if (!arr) return;
      curGroup = group;
      curIndex = (index + arr.length) % arr.length;
      var item = arr[curIndex];
      resetView();
      // full-resolution, high quality
      img.src = imgURL(item.file, "auto=format&q=92");
      img.alt = item.alt;
      countEl.textContent = (curIndex + 1) + " / " + arr.length;
    }
    function open(group, index) {
      show(group, index);
      lb.classList.add("open");
      document.documentElement.style.overflow = "hidden";
    }
    function close() {
      lb.classList.remove("open");
      document.documentElement.style.overflow = "";
      img.src = "";
    }
    function next() { show(curGroup, curIndex + 1); }
    function prev() { show(curGroup, curIndex - 1); }

    tiles.forEach(function (t) {
      t.addEventListener("click", function () {
        open(t.getAttribute("data-group") || "default", parseInt(t.getAttribute("data-index"), 10) || 0);
      });
    });

    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); next(); });
    lb.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); prev(); });

    // click empty space closes (but not when zoomed/panning)
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target === stage) { if (scale <= 1.02) close(); else resetView(); }
    });

    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    });

    // wheel zoom (desktop)
    stage.addEventListener("wheel", function (e) {
      if (!lb.classList.contains("open")) return;
      e.preventDefault();
      var prevScale = scale;
      scale += (e.deltaY < 0 ? 0.25 : -0.25);
      scale = Math.max(MIN, Math.min(MAX, scale));
      if (scale === 1) { tx = 0; ty = 0; }
      else {
        // zoom toward cursor
        var r = img.getBoundingClientRect();
        var cx = e.clientX - (r.left + r.width / 2);
        var cy = e.clientY - (r.top + r.height / 2);
        var f = scale / prevScale;
        tx = tx - cx * (f - 1);
        ty = ty - cy * (f - 1);
      }
      apply();
    }, { passive: false });

    // pointer drag to pan when zoomed
    var dragging = false, sx = 0, sy = 0, stx = 0, sty = 0;
    stage.addEventListener("pointerdown", function (e) {
      if (scale <= 1) return;
      dragging = true; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      tx = stx + (e.clientX - sx);
      ty = sty + (e.clientY - sy);
      apply();
    });
    stage.addEventListener("pointerup", function () { dragging = false; });
    stage.addEventListener("pointercancel", function () { dragging = false; });

    // touch: swipe to navigate (when not zoomed) + pinch to zoom
    var touchStartX = 0, touchStartY = 0, pinchStart = 0, pinchBase = 1, touchMode = "";
    function dist(t) {
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    stage.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        touchMode = "pinch"; pinchStart = dist(e.touches); pinchBase = scale;
      } else if (e.touches.length === 1) {
        touchMode = scale > 1 ? "pan" : "swipe";
        touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; stx = tx; sty = ty;
      }
    }, { passive: true });
    stage.addEventListener("touchmove", function (e) {
      if (touchMode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        scale = Math.max(MIN, Math.min(MAX, pinchBase * (dist(e.touches) / pinchStart)));
        if (scale === 1) { tx = 0; ty = 0; }
        apply();
      } else if (touchMode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        tx = stx + (e.touches[0].clientX - touchStartX);
        ty = sty + (e.touches[0].clientY - touchStartY);
        apply();
      }
    }, { passive: false });
    stage.addEventListener("touchend", function (e) {
      if (touchMode === "swipe") {
        var dx = (e.changedTouches[0].clientX - touchStartX);
        var dy = (e.changedTouches[0].clientY - touchStartY);
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { close(); }
      }
      if (scale <= 1) { scale = 1; tx = 0; ty = 0; apply(); }
      touchMode = "";
    });

    // double-tap / double-click toggle zoom
    var lastTap = 0;
    stage.addEventListener("dblclick", function () { scale = scale > 1 ? 1 : 2.5; if (scale === 1){tx=0;ty=0;} apply(); });
    stage.addEventListener("touchend", function () {
      var now = Date.now();
      if (now - lastTap < 300) { scale = scale > 1 ? 1 : 2.5; if (scale === 1){tx=0;ty=0;} apply(); }
      lastTap = now;
    });
  }

  /* ============================================================
     4. "(view the gallery below)" smooth scroll
     ============================================================ */
  function galleryJump() {
    document.querySelectorAll(".gallery-jump").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = document.getElementById("gallery");
        if (g) g.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ============================================================
     5. IMAGE DOWNLOAD PROTECTION
        No right-click save, no drag-out, no long-press save.
        (Deterrent — images are still delivered by the browser,
        but casual saving is blocked as requested.)
     ============================================================ */
  function protectImages() {
    // Block context menu on images / media wrappers
    document.addEventListener("contextmenu", function (e) {
      var t = e.target;
      if (t && (t.tagName === "IMG" || t.tagName === "SVG" || t.closest(".tile,.lightbox,.hover-cover,.wordmark"))) {
        e.preventDefault();
      }
    });
    // Block drag
    document.addEventListener("dragstart", function (e) {
      if (e.target && e.target.tagName === "IMG") e.preventDefault();
    });
    // Mark all images undraggable
    function markAll() {
      document.querySelectorAll("img").forEach(function (im) {
        im.setAttribute("draggable", "false");
        im.oncontextmenu = function () { return false; };
      });
    }
    markAll();
    // Long-press on touch — suppress the default callout/save
    var pressTimer = null;
    document.addEventListener("touchstart", function (e) {
      if (e.target && e.target.tagName === "IMG") {
        pressTimer = window.setTimeout(function () {}, 0);
      }
    }, { passive: true });
    document.addEventListener("touchend", function () {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });
    // Re-mark images added later (defensive)
    var mo = new MutationObserver(markAll);
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- boot ---------- */
  function boot() {
    protectImages();
    runIntro();
    catalogueHover();
    lightbox();
    galleryJump();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
