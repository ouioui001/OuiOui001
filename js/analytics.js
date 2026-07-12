// HARDCPY — pageview analytics via GoatCounter (goatcounter.com).
// Privacy-friendly: no cookies, no personal data, so no consent banner
// is needed. Product pages are recorded as /product/<id>-<title> so the
// dashboard shows which listings get the most traffic.
// Dashboard: https://hardcpy.goatcounter.com
(function () {
  var path = location.pathname.replace(/\/index\.html$/, "/");
  var id = new URLSearchParams(location.search).get("id");
  if (path.indexOf("product.html") !== -1 && id && typeof BOOKS !== "undefined") {
    var book = null;
    for (var i = 0; i < BOOKS.length; i++) {
      if (String(BOOKS[i].id) === id) { book = BOOKS[i]; break; }
    }
    var slug = book
      ? "-" + book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
      : "";
    path = "/product/" + id + slug;
  }
  window.goatcounter = { path: path };
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://hardcpy.goatcounter.com/count");
  document.head.appendChild(s);
})();
