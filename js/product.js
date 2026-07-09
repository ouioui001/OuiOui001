// Product page: renders one listing from BOOKS by ?id=…

(function () {
  var id = parseInt(new URLSearchParams(location.search).get("id"), 10);
  var index = BOOKS.findIndex(function (b) { return b.id === id; });
  if (index === -1) {
    location.replace("index.html");
    return;
  }
  var book = BOOKS[index];

  document.title = book.title + " — OuiOui Prints";
  document.getElementById("product-crumb").textContent = book.title.toUpperCase();
  document.getElementById("p-title").textContent = book.title;

  var priceEl = document.getElementById("p-price");
  priceEl.textContent = formatPrice(book.price) + " USD";
  if (book.reduced && book.originalPrice) {
    var was = document.createElement("span");
    was.className = "was";
    was.textContent = formatPrice(book.originalPrice);
    priceEl.appendChild(was);
  }

  document.getElementById("p-desc").textContent = book.details.join("\n");

  // ---------- gallery ----------
  // First image is the processed cover stored in the repo; any further
  // photos are loaded from the Depop CDN at full size.
  var gallery = document.getElementById("gallery");
  var sources = [book.cover].concat(book.photos.slice(1));
  sources.forEach(function (src, i) {
    var img = document.createElement("img");
    img.src = src;
    img.alt = book.title + " — photo " + (i + 1);
    if (i > 0) img.loading = "lazy";
    var n = document.createElement("span");
    n.className = "ph-num";
    n.textContent = i + 1;
    img.onerror = function () { img.remove(); n.remove(); };
    gallery.appendChild(img);
    gallery.appendChild(n);
  });

  // ---------- spec panel ----------
  var specs = [
    '<span class="dot">●</span> IN STOCK',
    "TYPE: " + book.kind.replace(/s$/, ""),
    "SHIPPING (US): " + (book.shipping ? formatPrice(book.shipping) : "SEE DEPOP"),
    "SHIPS WORLDWIDE",
    "SOLD VIA DEPOP @OUIOUIPRINTS"
  ];
  var list = document.getElementById("spec-list");
  specs.forEach(function (s) {
    var li = document.createElement("li");
    li.innerHTML = s;
    list.appendChild(li);
  });

  document.getElementById("buy-btn").href = book.depopUrl;
  document.getElementById("topbar-buy").href = book.depopUrl;

  // ---------- prev / next ----------
  var prev = document.getElementById("prev-link");
  var next = document.getElementById("next-link");
  if (index > 0) {
    prev.hidden = false;
    prev.href = "product.html?id=" + BOOKS[index - 1].id;
  }
  if (index < BOOKS.length - 1) {
    next.hidden = false;
    next.href = "product.html?id=" + BOOKS[index + 1].id;
  }
})();
