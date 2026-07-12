// Client-side cart ("Stack"). Persists to localStorage and resolves line
// items from the global BOOKS catalogue. Checkout goes through per-listing
// Stripe payment pages (data/paylinks.js) — every piece is one-of-one, so
// each page allows a single completed purchase and then marks itself sold.

(function () {
  var KEY = "hardcpy-cart";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function write(cart) {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {}
    refresh();
  }
  function bookById(id) {
    return (typeof BOOKS !== "undefined") &&
      BOOKS.filter(function (b) { return b.id === id; })[0];
  }
  function count() {
    var c = read(), n = 0;
    Object.keys(c).forEach(function (k) { n += c[k]; });
    return n;
  }
  function subtotal() {
    var c = read(), t = 0;
    Object.keys(c).forEach(function (k) {
      var b = bookById(parseInt(k, 10));
      if (b && b.price) t += parseFloat(b.price) * c[k];
    });
    return t;
  }

  // ---------- drawer markup (injected once) ----------
  var drawer = document.createElement("aside");
  drawer.id = "cart-drawer";
  drawer.className = "cart-drawer";
  drawer.hidden = true;
  drawer.innerHTML =
    '<button class="panel-close" data-cart-close>×</button>' +
    '<h2 class="cart-heading">YOUR STACK</h2>' +
    '<div id="cart-lines" class="cart-lines"></div>' +
    '<div class="cart-foot">' +
      '<p class="cart-subtotal"><span>SUBTOTAL</span><span id="cart-subtotal-v"></span></p>' +
      '<button id="cart-checkout" class="buy-btn">CHECKOUT</button>' +
      '<p id="cart-msg" class="cart-msg" hidden>Checkout is coming soon — the shop is being set up. Nothing has been charged.</p>' +
    '</div>';
  document.body.appendChild(drawer);

  var scrim = document.createElement("div");
  scrim.className = "cart-scrim";
  scrim.hidden = true;
  document.body.appendChild(scrim);

  function open() { renderLines(); drawer.hidden = false; scrim.hidden = false; }
  function close() { drawer.hidden = true; scrim.hidden = true; }

  scrim.addEventListener("click", close);
  drawer.querySelector("[data-cart-close]").addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  function linkFor(id) {
    return (typeof PAYLINKS !== "undefined" && PAYLINKS[String(id)]) || "";
  }

  var checkoutBtn = drawer.querySelector("#cart-checkout");
  checkoutBtn.addEventListener("click", function () {
    var ids = Object.keys(read());
    if (!ids.length) return;
    var msg = document.getElementById("cart-msg");
    if (ids.length === 1 && linkFor(ids[0])) {
      // one piece — straight to its secure Stripe payment page
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "REDIRECTING…";
      window.location.href = linkFor(ids[0]);
      return;
    }
    // several pieces — each one-of-one item checks out on its own page
    msg.textContent = "Each piece is one-of-one and checks out individually — " +
      "tap BUY next to an item to purchase it, then come back for the rest.";
    msg.hidden = false;
  });

  function renderLines() {
    var c = read();
    var wrap = document.getElementById("cart-lines");
    wrap.textContent = "";
    var ids = Object.keys(c);
    if (!ids.length) {
      var e = document.createElement("p");
      e.className = "cart-empty";
      e.textContent = "YOUR STACK IS EMPTY.";
      wrap.appendChild(e);
      document.getElementById("cart-checkout").disabled = true;
      document.getElementById("cart-subtotal-v").textContent = "$0";
      return;
    }
    document.getElementById("cart-checkout").disabled = false;
    ids.forEach(function (k) {
      var b = bookById(parseInt(k, 10));
      if (!b) return;
      var qty = c[k];
      var row = document.createElement("div");
      row.className = "cart-line";
      row.innerHTML =
        '<img src="' + b.cover + '" alt="">' +
        '<div class="cart-line-main">' +
          '<span class="cart-line-t">' + b.title + '</span>' +
          '<span class="cart-line-p">' + priceLabel(b) + '</span>' +
        '</div>' +
        '<div class="cart-qty">' +
          '<button data-dec="' + k + '">−</button>' +
          '<span>' + qty + '</span>' +
          '<button data-inc="' + k + '">+</button>' +
        '</div>' +
        (linkFor(k) ? '<a class="cart-buy" href="' + linkFor(k) + '">BUY</a>' : '') +
        '<button class="cart-remove" data-rm="' + k + '">REMOVE</button>';
      wrap.appendChild(row);
    });
    document.getElementById("cart-subtotal-v").textContent = formatPrice(subtotal());
  }

  drawer.addEventListener("click", function (e) {
    var t = e.target;
    var c = read();
    if (t.dataset.inc) { c[t.dataset.inc]++; write(c); renderLines(); }
    else if (t.dataset.dec) {
      c[t.dataset.dec]--;
      if (c[t.dataset.dec] <= 0) delete c[t.dataset.dec];
      write(c); renderLines();
    } else if (t.dataset.rm) { delete c[t.dataset.rm]; write(c); renderLines(); }
  });

  // ---------- topbar cart button(s) ----------
  function refresh() {
    var n = count();
    document.querySelectorAll("[data-cart-tab]").forEach(function (el) {
      el.textContent = "Stack (" + n + ")";
    });
  }

  document.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-cart-tab]");
    if (tab) { e.preventDefault(); open(); }
  });

  // ---------- public API ----------
  window.Cart = {
    add: function (id) {
      var c = read();
      c[id] = (c[id] || 0) + 1;
      write(c);
      open();
    },
    open: open
  };

  refresh();
})();
