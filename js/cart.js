// Client-side cart. Persists to localStorage and resolves line items from
// the global BOOKS catalogue. Checkout is a placeholder for now — this is
// an independent storefront with no payment backend yet.

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

  var checkoutBtn = drawer.querySelector("#cart-checkout");
  checkoutBtn.addEventListener("click", function () {
    if (count() === 0) return;
    var endpoint = (window.STOREFRONT && window.STOREFRONT.checkoutEndpoint) || "";
    var msg = document.getElementById("cart-msg");
    if (!endpoint) {                       // not wired up yet — show the note
      msg.hidden = false;
      return;
    }
    // Hand the cart to the backend, which builds a Stripe Checkout Session
    // (prices validated server-side) and returns its hosted URL.
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "REDIRECTING…";
    msg.hidden = true;
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart: read() }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d && res.d.url) { window.location.href = res.d.url; return; }
        throw new Error((res.d && res.d.error) || "Checkout failed");
      })
      .catch(function (err) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = "CHECKOUT";
        msg.textContent = "Sorry — checkout could not start. " + (err.message || "") +
          " Please try again, or email us to complete your order.";
        msg.hidden = false;
      });
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
