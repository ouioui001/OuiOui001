// Shared behaviour: intro animation, nav state, image protection.

// ---------- image download protection ----------
// Blocks right-click save, drag-out, and (with the CSS touch-callout
// rule) mobile long-press save. Client-side deterrence only.
document.addEventListener("contextmenu", function (e) {
  if (e.target.closest("img, .gallery, #lightbox")) e.preventDefault();
});
document.addEventListener("dragstart", function (e) {
  if (e.target.tagName === "IMG") e.preventDefault();
});

// ---------- intro animation ----------
// The logo draws itself on a white screen, then the site fades in.
// Shown once per browser session so navigation stays fast.
(function () {
  var intro = document.getElementById("intro");
  if (!intro) return;
  var KEY = "ouioui001-intro-seen";
  var seen = false;
  try { seen = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  if (seen) {
    intro.remove();
    return;
  }
  try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
  window.setTimeout(function () {
    intro.classList.add("done");
    window.setTimeout(function () { intro.remove(); }, 800);
  }, 2600);
})();

// ---------- nav current-page marker ----------
(function () {
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a").forEach(function (a) {
    if (a.getAttribute("href") === here) a.setAttribute("aria-current", "page");
  });
})();
