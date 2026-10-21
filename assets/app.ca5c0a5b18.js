/* DeepSpeed hackathon docs — behaviour.
   Theme is applied by an inline head script so there is no flash; this file
   handles the toggle, the mobile drawer, code copying, the slide viewer, the
   results tabs and scrollspy. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---- Theme -------------------------------------------------------- */
  var toggle = document.querySelector(".toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("ds-theme", next); } catch (e) { /* private mode */ }
      toggle.setAttribute("aria-label", "Switch to " + (next === "light" ? "dark" : "light") + " theme");
    });
  }

  /* ---- Platform ------------------------------------------------------
     The attribute is already set by the inline head script; this only wires
     the buttons and keeps every copy of the switch in agreement. */
  var pfButtons = Array.prototype.slice.call(document.querySelectorAll("[data-set-pf]"));
  function markPlatform(id) {
    pfButtons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-set-pf") === id ? "true" : "false");
    });
  }
  pfButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-set-pf");
      root.setAttribute("data-platform", id);
      try { localStorage.setItem("ds-platform", id); } catch (e) { /* private mode */ }
      markPlatform(id);
    });
  });
  markPlatform(root.getAttribute("data-platform") || "linux");

  /* ---- Mobile drawer ------------------------------------------------ */
  var navbtn = document.querySelector(".navbtn");
  var scrim = document.querySelector(".scrim");
  function closeNav() { document.body.classList.remove("nav-on"); if (navbtn) navbtn.setAttribute("aria-expanded", "false"); }
  if (navbtn) {
    navbtn.addEventListener("click", function () {
      var on = document.body.classList.toggle("nav-on");
      navbtn.setAttribute("aria-expanded", on ? "true" : "false");
    });
  }
  if (scrim) scrim.addEventListener("click", closeNav);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  Array.prototype.forEach.call(document.querySelectorAll(".nav a"), function (a) {
    a.addEventListener("click", closeNav);
  });

  /* ---- Copy buttons ------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll(".code"), function (block) {
    var pre = block.querySelector("pre");
    if (!pre) return;
    var btn = document.createElement("button");
    btn.className = "copy";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.addEventListener("click", function () {
      var text = pre.innerText;
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { btn.textContent = "Failed"; });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "absolute"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { btn.textContent = "Failed"; }
        document.body.removeChild(ta);
      }
    });
    block.appendChild(btn);
  });

  /* ---- Slide viewer --------------------------------------------------
     The info talk is a two-megabyte PDF, so it is fetched only once a reader
     asks for it: the plate is a plain link to the file, and this swaps it for
     an inline viewer in place. On a narrow screen the link is left alone —
     phone browsers render an embedded PDF as a blank box or a download
     prompt, and a tab of its own reads better there. */
  var deck = document.querySelector(".deck-view[data-pdf]");
  var plate = deck && deck.querySelector(".deck-plate");
  if (plate) {
    plate.addEventListener("click", function (ev) {
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      if (window.matchMedia("(max-width: 900px)").matches) return;
      ev.preventDefault();
      var frame = document.createElement("iframe");
      frame.src = deck.getAttribute("data-pdf") + "#view=FitH";
      frame.title = deck.getAttribute("data-pdf-title") || "Slides";
      frame.setAttribute("allowfullscreen", "");
      deck.replaceChild(frame, plate);
      frame.focus();
    });
  }

  /* ---- Results tabs ---------------------------------------------------
     One leaderboard at a time. Both are in the HTML, so with this script off
     they just stack. The hero's winner plates link to #track-N and so can any
     outside link, which means the tab has to open before the page can scroll
     to it — hence taking over those links, and the hash on load. */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  if (tabs.length) {
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
    var select = function (i, focus) {
      tabs.forEach(function (t, n) {
        var on = n === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        panels[n].classList.toggle("is-on", on);
      });
      if (focus) tabs[i].focus();
    };
    var open = function (hash, scroll) {
      var i = panels.map(function (p) { return "#" + p.id; }).indexOf(hash);
      if (i < 0) return false;
      select(i);
      if (scroll) document.getElementById("results").scrollIntoView();
      return true;
    };

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
      t.addEventListener("keydown", function (ev) {
        var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[ev.key];
        if (next === undefined) return;
        ev.preventDefault();
        select((next + tabs.length) % tabs.length, true);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('a[href^="#track-"]'), function (a) {
      a.addEventListener("click", function (ev) {
        if (!open(a.getAttribute("href"), true)) return;
        ev.preventDefault();
        try { history.replaceState(null, "", a.getAttribute("href")); } catch (e) { /* sandboxed */ }
      });
    });
    open(location.hash, true);
  }

  /* ---- Scrollspy for "On this page" --------------------------------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    var targets = [];
    links.forEach(function (a) {
      var el = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
      if (el) { byId[el.id] = a; targets.push(el); }
    });
    var visible = new Set();
    var mark = function () {
      links.forEach(function (a) { a.classList.remove("on"); });
      var first = targets.filter(function (t) { return visible.has(t.id); })[0];
      if (!first) return;
      var a = byId[first.id];
      if (a) a.classList.add("on");
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target.id); else visible.delete(en.target.id);
      });
      mark();
    }, { rootMargin: "-70px 0px -70% 0px", threshold: 0 });
    targets.forEach(function (t) { io.observe(t); });
  }
})();
