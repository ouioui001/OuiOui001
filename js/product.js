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
  priceEl.textContent = priceLabel(book);
  if (book.reduced && book.originalPrice) {
    var was = document.createElement("span");
    was.className = "was";
    was.textContent = formatPrice(book.originalPrice);
    priceEl.appendChild(was);
  }

  document.getElementById("p-desc").textContent = book.details.join("\n");

  // ---------- gallery ----------
  // book.photos holds the high-resolution images (full-size cover first,
  // then any extra shots) — used for the product hero and zoom lightbox.
  // The small book.cover thumbnail is only used in the grid/cart.
  var gallery = document.getElementById("gallery");
  var sources = (book.photos && book.photos.length) ? book.photos.slice() : [book.cover];
  sources.forEach(function (src, i) {
    var img = document.createElement("img");
    img.src = src;
    img.alt = book.title + " — photo " + (i + 1);
    if (i === 0) img.className = "is-cover";
    if (i > 0) img.loading = "lazy";
    var n = document.createElement("span");
    n.className = "ph-num";
    n.textContent = i + 1;
    img.onerror = function () { img.remove(); n.remove(); };
    // tap a photo to enlarge / zoom (fullscreen lightbox)
    img.addEventListener("click", function () {
      var imgs = Array.prototype.slice.call(gallery.querySelectorAll("img"));
      Lightbox.open(imgs.map(function (m) { return m.src; }), imgs.indexOf(img));
    });
    gallery.appendChild(img);
    gallery.appendChild(n);
  });
  if (sources.length) {
    var hint = document.createElement("p");
    hint.className = "gallery-hint";
    hint.textContent = "Tap photo to enlarge";
    gallery.insertAdjacentElement("afterend", hint);
  }

  // ---------- spec panel ----------
  var specs = [
    '<span class="dot">●</span> IN STOCK',
    "TYPE: " + book.kind.replace(/s$/, ""),
    "SHIPS WORLDWIDE"
  ];
  var list = document.getElementById("spec-list");
  specs.forEach(function (s) {
    var li = document.createElement("li");
    li.innerHTML = s;
    list.appendChild(li);
  });

  // ---------- add to cart ----------
  var addBtn = document.getElementById("add-btn");
  addBtn.addEventListener("click", function () {
    Cart.add(book.id);
    addBtn.textContent = "ADDED ✓";
    setTimeout(function () { addBtn.textContent = "ADD TO STACK"; }, 1400);
  });

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
