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
(function () {
  var tab = document.getElementById("menu-tab");
  var overlay = document.getElementById("menu-overlay");
  if (!tab || !overlay) return;
  function toggle(open) {
    overlay.hidden = !open;
    tab.setAttribute("aria-expanded", String(open));
  }
  tab.addEventListener("click", function () { toggle(overlay.hidden); });
  overlay.querySelector("[data-close]").addEventListener("click", function () { toggle(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") toggle(false);
  });

  // item counts next to the menu entries
  if (typeof BOOKS !== "undefined") {
    var counts = { all: BOOKS.length, Books: 0, Magazines: 0, Catalogs: 0 };
    BOOKS.forEach(function (b) { counts[b.kind] = (counts[b.kind] || 0) + 1; });
    var map = {
      "count-all": counts.all,
      "count-books": counts.Books,
      "count-mags": counts.Magazines,
      "count-cats": counts.Catalogs
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  }
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
