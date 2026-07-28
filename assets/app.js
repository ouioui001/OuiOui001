/* OuiOui001 — interactions
   Intro draw animation · catalogue hover preview · gallery lightbox with zoom
   · image download protection. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  var CDN = "https://cdn.sanity.io/images/up4mo0bf/production/";
  // Offline archive sets window.OUIOUI_IMG_BASE to a local folder; then every
  // image (thumbnails, hover previews, lightbox) loads the local original file.
  var IMG_BASE = (typeof window !== "undefined" && window.OUIOUI_IMG_BASE) || null;
  function imgURL(file, opts) {
    if (IMG_BASE) return IMG_BASE + file;   // local original, ignore CDN params
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
        Covers are warmed in the browser cache during idle time
        so the preview appears instantly.
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

    // idle-time cover warm-up — desktop pointer devices only
    if (window.matchMedia("(min-width: 1024px) and (hover: hover)").matches) {
      var files = [];
      items.forEach(function (a) {
        var f = a.getAttribute("data-cover");
        if (f) files.push(f);
      });
      var i = 0;
      function warmNext(deadline) {
        while (i < files.length && (!deadline || deadline.timeRemaining() > 4)) {
          var im = new Image();
          im.src = imgURL(files[i++], "w=700&auto=format&q=85");
        }
        if (i < files.length) idle(warmNext);
      }
      var idle = window.requestIdleCallback
        ? function (fn) { window.requestIdleCallback(fn, { timeout: 3000 }); }
        : function (fn) { window.setTimeout(fn, 400); };
      idle(warmNext);
    }
  }

  /* ============================================================
     3. LIGHTBOX — click any gallery/archive photo to zoom.
        A screen-sized image is shown immediately, then the native
        full-resolution file is swapped in as soon as it's loaded.
        Neighbours are preloaded so prev/next are instant.
        One delegated click listener serves every tile.
     ============================================================ */
  function lightbox() {
    if (!document.querySelector(".tile[data-file]")) return;

    // build DOM
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML =
      '<div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div>' +
      '<span class="lb-count"></span>' +
      '<button class="lb-btn lb-close" aria-label="Close">(close)</button>' +
      '<button class="lb-btn lb-prev" aria-label="Previous">&#8592;</button>' +
      '<button class="lb-btn lb-next" aria-label="Next">&#8594;</button>' +
      '<div class="lb-hint">scroll or pinch to zoom · drag to pan · &#8592; &#8594; to browse · esc to close</div>' +
      '<div class="lb-swipe" aria-hidden="true">&#8592; swipe &#8594;</div>';
    document.body.appendChild(lb);

    var img = lb.querySelector(".lb-img");
    var stage = lb.querySelector(".lb-stage");
    var countEl = lb.querySelector(".lb-count");
    var curGroup = null, curIndex = 0;
    var scale = 1, tx = 0, ty = 0;
    var MIN = 1, MAX = 6;
    var loadToken = 0;

    // group index built lazily, one pass per group, cached
    var groupsCache = {};
    function getGroup(name) {
      if (!groupsCache[name]) {
        var arr = [];
        document.querySelectorAll(".tile[data-file]").forEach(function (t) {
          if ((t.getAttribute("data-group") || "default") === name) {
            arr.push({ file: t.getAttribute("data-file"), alt: t.getAttribute("alt") || "", el: t });
          }
        });
        groupsCache[name] = arr;
      }
      return groupsCache[name];
    }

    function apply() {
      img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
    }
    function resetView() { scale = 1; tx = 0; ty = 0; apply(); }

    var FAST = "w=1600&auto=format&q=90";   // screen-sized, loads fast
    var FULL = "auto=format&q=95";          // native full resolution

    function preload(arr, i) {
      var it = arr[(i + arr.length) % arr.length];
      var im = new Image();
      im.src = imgURL(it.file, FAST);
    }

    function show(group, index) {
      var arr = getGroup(group);
      if (!arr || !arr.length) return;
      curGroup = group;
      curIndex = (index + arr.length) % arr.length;
      var item = arr[curIndex];
      resetView();
      var token = ++loadToken;

      // 1) immediate: screen-sized image
      img.src = imgURL(item.file, FAST);
      img.alt = item.alt;
      countEl.textContent = (curIndex + 1) + " / " + arr.length;

      // 2) background: swap in the native full-resolution file
      var full = new Image();
      full.onload = function () {
        if (token === loadToken && lb.classList.contains("open")) img.src = full.src;
      };
      full.src = imgURL(item.file, FULL);

      // 3) warm the neighbours for instant prev/next
      preload(arr, curIndex + 1);
      preload(arr, curIndex - 1);
    }
    // faint one-time "swipe" cue for touch users, ~2s then gone
    var swipeEl = lb.querySelector(".lb-swipe");
    function maybeSwipeHint(count) {
      if (count < 2) return;
      if (!window.matchMedia("(pointer: coarse)").matches) return;
      var seen = false;
      try { seen = sessionStorage.getItem("ouioui_swipe") === "1"; } catch (e) {}
      if (seen) return;
      try { sessionStorage.setItem("ouioui_swipe", "1"); } catch (e) {}
      swipeEl.classList.add("show");
      window.setTimeout(function () { swipeEl.classList.remove("show"); }, 2000);
    }

    function open(group, index) {
      show(group, index);
      lb.classList.add("open");
      document.documentElement.style.overflow = "hidden";
      maybeSwipeHint(getGroup(group).length);
    }
    function close() {
      lb.classList.remove("open");
      document.documentElement.style.overflow = "";
      loadToken++; // cancel any pending full-res swap
      img.removeAttribute("src");
      swipeEl.classList.remove("show");
    }
    function next() { show(curGroup, curIndex + 1); }
    function prev() { show(curGroup, curIndex - 1); }

    // one delegated listener for every tile on the page
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest(".tile[data-file]") : null;
      if (!t) return;
      var g = t.getAttribute("data-group") || "default";
      var arr = getGroup(g);
      var idx = 0;
      for (var i = 0; i < arr.length; i++) { if (arr[i].el === t) { idx = i; break; } }
      open(g, idx);
    });

    lb.querySelector(".lb-close").addEventListener("click", function (e) {
      e.stopPropagation();
      close();
    });
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
        Two document-level listeners + CSS (user-drag, touch-callout)
        cover every image, including ones added later — no per-image
        work, no DOM scanning.
     ============================================================ */
  function protectImages() {
    document.addEventListener("contextmenu", function (e) {
      var t = e.target;
      if (!t) return;
      if (t.tagName === "IMG" ||
          (t.closest && t.closest(".tile,.lightbox,.hover-cover,.wordmark,svg"))) {
        e.preventDefault();
      }
    });
    document.addEventListener("dragstart", function (e) {
      if (e.target && e.target.tagName === "IMG") e.preventDefault();
    });
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
