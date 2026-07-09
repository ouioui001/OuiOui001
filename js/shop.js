// Shop page: renders the catalogue grid / list, refine panel, sorting.

(function () {
  var state = {
    mode: "grid",
    sort: "new",
    types: [],   // empty = all
    topics: []   // empty = all
  };

  // deep link: index.html?type=Books
  var params = new URLSearchParams(location.search);
  var typeParam = params.get("type");
  if (typeParam) state.types = [typeParam];

  var gridEl = document.getElementById("grid");
  var listEl = document.getElementById("list");
  var emptyEl = document.getElementById("empty");

  // ---------- refine panel construction ----------
  var KINDS = ["Books", "Magazines", "Catalogs"];
  var TOPICS = [];
  BOOKS.forEach(function (b) {
    b.topics.forEach(function (t) {
      if (TOPICS.indexOf(t) === -1) TOPICS.push(t);
    });
  });
  TOPICS.sort();

  function addChecks(groupId, values, checked) {
    var group = document.getElementById(groupId);
    values.forEach(function (v) {
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.value = v;
      input.checked = checked.indexOf(v) !== -1;
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + v.toUpperCase()));
      group.appendChild(label);
    });
  }
  addChecks("type-group", KINDS, state.types);
  addChecks("topic-group", TOPICS, state.topics);

  var panel = document.getElementById("refine-panel");
  var refineTab = document.getElementById("refine-tab");
  refineTab.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    refineTab.setAttribute("aria-expanded", String(!panel.hidden));
  });
  panel.querySelector("[data-close]").addEventListener("click", function () {
    panel.hidden = true;
  });

  panel.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "mode") state.mode = t.value;
    else if (t.name === "sort") state.sort = t.value;
    else if (t.type === "checkbox") {
      var pool = t.closest("#type-group") ? state.types : state.topics;
      var i = pool.indexOf(t.value);
      if (t.checked && i === -1) pool.push(t.value);
      if (!t.checked && i !== -1) pool.splice(i, 1);
    }
    render();
  });

  document.getElementById("refine-clear").addEventListener("click", function () {
    state.types = [];
    state.topics = [];
    state.sort = "new";
    state.mode = "grid";
    panel.querySelectorAll("input[type=checkbox]").forEach(function (c) { c.checked = false; });
    panel.querySelector("input[name=sort][value=new]").checked = true;
    panel.querySelector("input[name=mode][value=grid]").checked = true;
    history.replaceState(null, "", "index.html");
    render();
  });

  // ---------- filtering / sorting ----------
  function current() {
    var items = BOOKS.filter(function (b) {
      if (state.types.length && state.types.indexOf(b.kind) === -1) return false;
      if (state.topics.length && !b.topics.some(function (t) { return state.topics.indexOf(t) !== -1; })) return false;
      return true;
    });
    var sorters = {
      "new": function (a, b) { return b.id - a.id; },
      "old": function (a, b) { return a.id - b.id; },
      "price-asc": function (a, b) { return parseFloat(a.price) - parseFloat(b.price); },
      "price-desc": function (a, b) { return parseFloat(b.price) - parseFloat(a.price); },
      "az": function (a, b) { return a.title.localeCompare(b.title); }
    };
    return items.sort(sorters[state.sort]);
  }

  // ---------- rendering ----------
  function cardFor(b) {
    var a = document.createElement("a");
    a.className = "card";
    a.href = "product.html?id=" + b.id;
    var fig = document.createElement("figure");
    var img = document.createElement("img");
    img.src = b.cover;
    img.alt = b.title;
    img.loading = "lazy";
    fig.appendChild(img);
    var t = document.createElement("div");
    t.className = "t";
    t.textContent = b.title;
    var p = document.createElement("div");
    p.className = "p";
    p.innerHTML = formatPrice(b.price) + ' <span class="cur">USD</span>';
    a.appendChild(fig);
    a.appendChild(t);
    a.appendChild(p);
    return a;
  }

  function rowFor(b) {
    var a = document.createElement("a");
    a.href = "product.html?id=" + b.id;
    var t = document.createElement("span");
    t.className = "lt";
    t.textContent = b.title;
    var k = document.createElement("span");
    k.className = "lk";
    k.textContent = b.kind;
    var p = document.createElement("span");
    p.textContent = formatPrice(b.price) + " USD";
    var s = document.createElement("span");
    s.className = "ls";
    s.textContent = "IN STOCK";
    a.appendChild(t);
    a.appendChild(k);
    a.appendChild(p);
    a.appendChild(s);
    return a;
  }

  function render() {
    var items = current();

    gridEl.textContent = "";
    listEl.textContent = "";
    gridEl.hidden = state.mode !== "grid";
    listEl.hidden = state.mode !== "list";
    emptyEl.hidden = items.length > 0;

    var target = state.mode === "grid" ? gridEl : listEl;
    var make = state.mode === "grid" ? cardFor : rowFor;
    items.forEach(function (b) { target.appendChild(make(b)); });

    // "Displaying ALL by COVER in GRID" line
    var filterLabel = "ALL";
    if (state.types.length === 1) filterLabel = state.types[0].toUpperCase();
    else if (state.types.length || state.topics.length) filterLabel = "REFINED";
    document.getElementById("disp-filter").textContent = filterLabel;
    document.getElementById("disp-mode").textContent = state.mode.toUpperCase();

    var n = document.getElementById("refine-count-n");
    if (n) n.textContent = "SHOWING " + items.length + " OF " + BOOKS.length;
  }

  render();
})();
