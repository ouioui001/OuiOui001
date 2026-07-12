// Product page: renders one listing from BOOKS by ?id=…

(function () {
  var id = parseInt(new URLSearchParams(location.search).get("id"), 10);
  var index = BOOKS.findIndex(function (b) { return b.id === id; });
  if (index === -1) {
    location.replace("index.html");
    return;
  }
  var book = BOOKS[index];

  document.title = book.title + " — HARDCPY";
  document.getElementById("product-crumb").textContent = book.title.toUpperCase();
  document.getElementById("p-title").textContent = book.title;

  // ---------- SEO: canonical + share tags + structured data ----------
  var pageUrl = "https://hardcpy.shop/product.html?id=" + book.id;
  var imgUrl = "https://hardcpy.shop/" + ((book.photos && book.photos[0]) || book.cover);
  var canon = document.createElement("link");
  canon.rel = "canonical";
  canon.href = pageUrl;
  document.head.appendChild(canon);
  [["og:title", book.title + " — HARDCPY"],
   ["og:url", pageUrl],
   ["og:image", imgUrl]].forEach(function (kv) {
    var m = document.createElement("meta");
    m.setAttribute("property", kv[0]);
    m.content = kv[1];
    document.head.appendChild(m);
  });
  var ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": book.title,
    "image": imgUrl,
    "url": pageUrl,
    "category": book.kind,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": book.price || "0",
      "availability": "https://schema.org/InStock",
      "url": pageUrl
    }
  };
  var ldTag = document.createElement("script");
  ldTag.type = "application/ld+json";
  ldTag.textContent = JSON.stringify(ld);
  document.head.appendChild(ldTag);

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
    img.decoding = "async";
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
  var sold = (typeof SOLD !== "undefined") && SOLD.indexOf(book.id) !== -1;
  var specs = [
    sold ? '<span class="dot dot--sold">●</span> SOLD OUT'
         : '<span class="dot">●</span> IN STOCK',
    "TYPE: " + book.kind.split("/").map(function (w) { return w.replace(/s$/, ""); }).join("/"),
    "SHIPS WORLDWIDE"
  ];
  var list = document.getElementById("spec-list");
  specs.forEach(function (s) {
    var li = document.createElement("li");
    li.innerHTML = s;
    list.appendChild(li);
  });

  // ---------- buy now (per-listing Stripe payment page) ----------
  var buyBtn = document.getElementById("buy-btn");
  var payUrl = (typeof PAYLINKS !== "undefined") && PAYLINKS[String(book.id)];
  if (buyBtn && payUrl && !sold) {
    buyBtn.href = payUrl;
    buyBtn.target = "_blank";
    buyBtn.rel = "noopener";
    buyBtn.hidden = false;
  }

  // ---------- add to cart ----------
  var addBtn = document.getElementById("add-btn");
  if (sold) {
    addBtn.disabled = true;
    addBtn.textContent = "SOLD OUT";
  } else {
    addBtn.addEventListener("click", function () {
      Cart.add(book.id);
      addBtn.textContent = "ADDED ✓";
      setTimeout(function () { addBtn.textContent = "ADD TO STACK"; }, 1400);
    });
  }

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
