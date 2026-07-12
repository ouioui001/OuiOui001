// Shared behaviour: image protection, intro, menu overlay, menu counts.

// ---------- image download protection ----------
// Blocks right-click save, drag-out, and (with the CSS touch-callout
// rule) mobile long-press save. Client-side deterrence only.
document.addEventListener("contextmenu", function (e) {
  if (e.target.closest("img, .gallery")) e.preventDefault();
});
document.addEventListener("dragstart", function (e) {
  if (e.target.tagName === "IMG") e.preventDefault();
});

// ---------- intro ----------
// Wordmark tracks in on a white screen, once per browser session.
(function () {
  var intro = document.getElementById("intro");
  if (!intro) return;
  var KEY = "hardcpy-intro-seen";
  var seen = false;
  try { seen = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  if (seen) {
    intro.remove();
    return;
  }
  try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
  window.setTimeout(function () {
    intro.classList.add("done");
    window.setTimeout(function () { intro.remove(); }, 600);
  }, 1500);
})();

// ---------- menu overlay ----------
// Full-screen menu drops down from the top; the two-line button toggles it
// (rotating and inverting while open). Tapping the hero also opens it.
(function () {
  var tab = document.getElementById("menu-tab");
  var overlay = document.getElementById("menu-overlay");
  if (!tab || !overlay) return;
  var isOpen = false;
  function toggle(open) {
    isOpen = open;
    overlay.classList.toggle("show", open);
    tab.classList.toggle("open", open);
    tab.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
  }
  tab.addEventListener("click", function () { toggle(!isOpen); });
  overlay.addEventListener("click", function (e) {
    if (e.target.closest("a")) toggle(false);   // navigating closes the menu
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") toggle(false);
  });
  var hero = document.getElementById("hero");
  if (hero) hero.addEventListener("click", function () { toggle(true); });
})();

// ---------- hero rotation ----------
// The homepage hero starts on a random listing and slowly crossfades
// through others. Skips auto-cycling for reduced-motion visitors.
(function () {
  var img = document.querySelector("#hero img");
  if (!img || typeof BOOKS === "undefined" || !BOOKS.length) return;

  function srcOf(b) { return (b.photos && b.photos[0]) || b.cover; }
  var current = Math.floor(Math.random() * BOOKS.length);
  function show(i) {
    img.src = srcOf(BOOKS[i]);
    img.alt = BOOKS[i].title + " — HARDcpy";
  }
  show(current);

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.setInterval(function () {
    var next = Math.floor(Math.random() * BOOKS.length);
    if (BOOKS.length > 1 && next === current) next = (next + 1) % BOOKS.length;
    var pre = new Image();
    pre.onload = function () {
      img.style.opacity = "0";
      window.setTimeout(function () {
        current = next;
        show(next);
        img.style.opacity = "1";
      }, 450);
    };
    pre.src = srcOf(BOOKS[next]);
  }, 7000);
})();

// ---------- shared helpers ----------
function formatPrice(amount) {
  var n = parseFloat(amount);
  var s = n % 1 === 0 ? String(n) : n.toFixed(2);
  return "$" + s;
}

// Price line for a book; some items are price-on-request.
function priceLabel(book, withCur) {
  if (!book.price) return "PRICE ON REQUEST";
  return formatPrice(book.price) + (withCur ? ' <span class="cur">USD</span>' : " USD");
}
