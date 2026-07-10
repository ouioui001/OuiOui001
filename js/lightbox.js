// Fullscreen photo lightbox with tap-to-zoom and drag-to-pan.
// Tuned for iPhone: pointer events, no reliance on native pinch inside a
// fixed overlay. window.Lightbox.open(sources, startIndex).

(function () {
  var ZOOM = 2.6;
  var box, stage, img, countEl;
  var list = [], idx = 0;
  var scale = 1, tx = 0, ty = 0;

  function build() {
    box = document.createElement("div");
    box.id = "lightbox";
    box.innerHTML =
      '<button id="lb-close" class="lb-btn" aria-label="Close">×</button>' +
      '<button id="lb-prev" class="lb-btn" aria-label="Previous">‹</button>' +
      '<button id="lb-next" class="lb-btn" aria-label="Next">›</button>' +
      '<div class="lb-stage"><img alt=""></div>' +
      '<div id="lb-count"></div>';
    document.body.appendChild(box);
    stage = box.querySelector(".lb-stage");
    img = box.querySelector("img");
    countEl = box.querySelector("#lb-count");

    box.querySelector("#lb-close").addEventListener("click", close);
    box.querySelector("#lb-prev").addEventListener("click", function (e) { e.stopPropagation(); go(-1); });
    box.querySelector("#lb-next").addEventListener("click", function (e) { e.stopPropagation(); go(1); });
    // tap on the backdrop (not the image) closes
    stage.addEventListener("click", function (e) { if (e.target === stage) close(); });
    document.addEventListener("keydown", function (e) {
      if (box.className !== "open") return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    });
    bindGestures();
  }

  function apply() {
    img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
    img.classList.toggle("zoomed", scale > 1);
  }
  function resetZoom() { scale = 1; tx = 0; ty = 0; apply(); }

  function clamp() {
    // keep the scaled image from drifting fully off-screen
    var r = img.getBoundingClientRect();
    var baseW = r.width / scale, baseH = r.height / scale;
    var maxX = Math.max(0, (baseW * scale - window.innerWidth) / 2);
    var maxY = Math.max(0, (baseH * scale - window.innerHeight) / 2);
    tx = Math.max(-maxX, Math.min(maxX, tx));
    ty = Math.max(-maxY, Math.min(maxY, ty));
  }

  function show() {
    img.src = list[idx];
    countEl.textContent = list.length > 1 ? (idx + 1) + " / " + list.length : "";
    resetZoom();
  }
  function go(d) {
    if (list.length < 2) return;
    idx = (idx + d + list.length) % list.length;
    show();
  }

  function open(sources, start) {
    if (!box) build();
    list = sources.slice();
    idx = start || 0;
    box.className = "open";
    document.documentElement.style.overflow = "hidden";
    show();
  }
  function close() {
    box.className = "";
    document.documentElement.style.overflow = "";
  }

  function bindGestures() {
    var down = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0, t0 = 0;
    img.addEventListener("pointerdown", function (e) {
      down = true; moved = false;
      sx = e.clientX; sy = e.clientY; ox = tx; oy = ty; t0 = Date.now();
      img.setPointerCapture(e.pointerId);
    });
    img.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
      if (scale > 1) {           // pan the zoomed image
        tx = ox + dx; ty = oy + dy; clamp(); apply();
      }
    });
    img.addEventListener("pointerup", function (e) {
      if (!down) return;
      down = false;
      var dx = e.clientX - sx, dy = e.clientY - sy, dt = Date.now() - t0;
      if (!moved && dt < 350) {                 // tap → toggle zoom
        if (scale > 1) resetZoom();
        else { scale = ZOOM; apply(); }
      } else if (scale === 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? 1 : -1);                     // swipe when not zoomed
      }
    });
  }

  window.Lightbox = { open: open };
})();
