/* WEIGL SOCIAL – Interaktion & Motion (Vanilla JS, keine Bibliotheken) */
(function () {
  "use strict";

  var root = document.documentElement;
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  function motionOff() { return mqReduce.matches || root.classList.contains("rm"); }

  var EXPO = "cubic-bezier(.16,1,.3,1)";
  var QUART = "cubic-bezier(.25,1,.5,1)";
  var QUINT = "cubic-bezier(.22,1,.36,1)";

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- Header & Menü ---------- */
  var hdr = document.querySelector(".hdr");
  var menuBtn = document.querySelector(".menu-btn");
  var nav = document.getElementById("hauptnavigation");

  function setMenu(open, focusFirst) {
    if (!hdr || !menuBtn) return;
    if (open) hdr.setAttribute("data-open", ""); else hdr.removeAttribute("data-open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.querySelector(".menu-btn__txt").textContent = open ? "Schließen" : "Menü";
    if (open && focusFirst) {
      var first = nav && nav.querySelector("a");
      if (first) setTimeout(function () { first.focus(); }, 60);
    }
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", function (e) {
      var open = !hdr.hasAttribute("data-open");
      setMenu(open, e.detail === 0);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && hdr.hasAttribute("data-open")) { setMenu(false); menuBtn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (hdr.hasAttribute("data-open") && !hdr.contains(e.target)) setMenu(false);
    });
    if (nav) nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  }

  /* Header blendet beim Runterscrollen aus, beim Hochscrollen wieder ein */
  var lastY = window.scrollY, ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (hdr && !hdr.hasAttribute("data-open") && !hdr.contains(document.activeElement)) {
        hdr.classList.toggle("is-hidden", y > lastY && y > 240);
      }
      lastY = y; ticking = false;
    });
  }, { passive: true });
  if (hdr) hdr.addEventListener("focusin", function () { hdr.classList.remove("is-hidden"); });

  /* ---------- Mosaik: jede Spalte einmal duplizieren, damit -50% nahtlos loopt ---------- */
  document.querySelectorAll(".mcol").forEach(function (col) {
    Array.prototype.slice.call(col.children).forEach(function (cell) {
      var c = cell.cloneNode(true);
      col.appendChild(c);
    });
  });

  /* Story-Balken: der aktive Balken wandert alle 6 s weiter */
  document.querySelectorAll(".reelui__bars").forEach(function (bars, idx) {
    var items = bars.querySelectorAll("i");
    if (!items.length) return;
    var i = idx % items.length;
    function step() {
      items.forEach(function (it, k) { it.classList.toggle("run", k === i); });
      i = (i + 1) % items.length;
    }
    step();
    setInterval(function () { if (!motionOff()) step(); }, 6000);
  });

  /* REC-Timecode */
  var recs = document.querySelectorAll("[data-rec]");
  if (recs.length) {
    var t0 = Date.now() - 14000;
    setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000) % 3600;
      var txt = "REC " + String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
      recs.forEach(function (r) { r.textContent = txt; });
    }, 1000);
  }

  /* ---------- Erreichbarkeit (Mo–Do 9–17, Fr 9–15, Europe/Berlin) ---------- */
  var HOURS = { 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 15] };
  var DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  function berlinNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
      var map = {}; parts.forEach(function (p) { map[p.type] = p.value; });
      var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(map.weekday);
      return { d: wd, h: parseInt(map.hour, 10) % 24 + parseInt(map.minute, 10) / 60 };
    } catch (e) { var n = new Date(); return { d: n.getDay(), h: n.getHours() + n.getMinutes() / 60 }; }
  }
  function status() {
    var n = berlinNow(), today = HOURS[n.d];
    if (today && n.h >= today[0] && n.h < today[1]) return { open: true, text: "Jetzt erreichbar · bis " + today[1] + " Uhr" };
    for (var k = 0; k < 7; k++) {
      var d = (n.d + k) % 7, hrs = HOURS[d];
      if (!hrs) continue;
      if (k === 0 && n.h < hrs[0]) return { open: false, text: "Heute ab " + hrs[0] + " Uhr erreichbar" };
      if (k === 1) return { open: false, text: "Morgen ab " + hrs[0] + " Uhr erreichbar" };
      if (k > 1) return { open: false, text: "Wieder erreichbar am " + DAYS[d] + " ab " + hrs[0] + " Uhr" };
    }
    return { open: false, text: "" };
  }
  document.querySelectorAll("[data-live]").forEach(function (el) {
    var s = status();
    el.querySelector(".live-txt").textContent = s.text;
    el.querySelector(".live-dot").classList.toggle("is-closed", !s.open);
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var rvs = document.querySelectorAll(".rv, .steps, .feature__media");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Intro-Timeline (Startseite) ---------- */
  function intro() {
    if (!root.classList.contains("intro")) return;
    if (motionOff() || !document.body.animate) { root.classList.remove("intro"); return; }
    var anims = [];
    function a(el, kf, opt) { if (el) anims.push(el.animate(kf, Object.assign({ fill: "both" }, opt))); }

    a(hdr, [{ transform: "translateY(calc(-100% - 48px))" }, { transform: "translateY(0)" }], { duration: 950, easing: EXPO });
    a(document.querySelector(".hero .eyebrow"), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 800, delay: 250, easing: QUART });
    document.querySelectorAll(".hero h1 .ln > span").forEach(function (s, i) {
      a(s, [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }], { duration: 1000, delay: 300 + i * 85, easing: EXPO });
    });
    a(document.querySelector(".hero__p"), [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 720, easing: QUART });
    document.querySelectorAll(".hero__acts > *").forEach(function (el, i) {
      a(el, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 840 + i * 90, easing: QUART });
    });
    a(document.querySelector(".hero__meta"), [{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 1050, easing: QUART });
    var mosaic = document.querySelector(".mosaic");
    a(mosaic, [{ opacity: 0 }, { opacity: 1 }], { duration: 1100, delay: 200, easing: QUART });
    document.querySelectorAll(".mcol").forEach(function (c, i) {
      var inner = c.firstElementChild;
      if (!inner) return;
      // die Kacheln steigen mit einem weichen Quint-Auslauf auf, die Spalte läuft per CSS weiter
      Array.prototype.forEach.call(c.children, function (cell, k) {
        if (k > 6) return;
        a(cell, [{ transform: "translateY(" + (36 + i * 8) + "%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
          { duration: 1600, delay: 250 + i * 110 + k * 60, easing: QUINT });
      });
    });

    Promise.all(anims.map(function (x) { return x.finished; })).then(function () {
      root.classList.remove("intro");
      anims.forEach(function (x) { try { x.cancel(); } catch (e) {} });
      root.setAttribute("data-entrance", "done");
    }).catch(function () { root.classList.remove("intro"); });
  }
  intro();

  /* ---------- Lesbarkeit (Barrierefreiheit) ---------- */
  var A11Y_KEY = "ws-a11y";
  var prefs = { fs: 100, hc: false, rm: false };
  try { var saved = JSON.parse(store(A11Y_KEY) || "null"); if (saved) prefs = Object.assign(prefs, saved); } catch (e) {}

  function applyPrefs() {
    if (prefs.fs > 100) root.setAttribute("data-fs", String(prefs.fs)); else root.removeAttribute("data-fs");
    root.classList.toggle("hc", !!prefs.hc);
    root.classList.toggle("rm", !!prefs.rm || mqReduce.matches);
    store(A11Y_KEY, JSON.stringify(prefs));
  }

  var a11y = document.createElement("div");
  a11y.className = "a11y";
  a11y.innerHTML =
    '<div class="a11y__panel" id="a11y-panel" role="dialog" aria-modal="false" aria-labelledby="a11y-title" hidden>' +
      '<p class="a11y__title" id="a11y-title">Lesbarkeit</p>' +
      '<div class="a11y__row"><span id="a11y-fs-label">Schrift <span data-fs-val>100</span>&nbsp;%</span>' +
        '<div class="a11y__ctrls" role="group" aria-labelledby="a11y-fs-label">' +
          '<button type="button" class="a11y__opt" data-fs="-" aria-label="Schrift verkleinern">A−</button>' +
          '<button type="button" class="a11y__opt" data-fs="+" aria-label="Schrift vergrößern">A+</button>' +
        '</div></div>' +
      '<div class="a11y__row"><span id="a11y-hc-label">Mehr Kontrast</span>' +
        '<button type="button" class="a11y__opt" data-toggle="hc" aria-labelledby="a11y-hc-label" aria-pressed="false">Aus</button></div>' +
      '<div class="a11y__row"><span id="a11y-rm-label">Bewegung reduzieren</span>' +
        '<button type="button" class="a11y__opt" data-toggle="rm" aria-labelledby="a11y-rm-label" aria-pressed="false">Aus</button></div>' +
      '<button type="button" class="a11y__reset">Zurücksetzen</button>' +
    '</div>' +
    '<button type="button" class="a11y__btn" aria-expanded="false" aria-controls="a11y-panel" aria-label="Lesbarkeit anpassen">Aa</button>';
  document.body.appendChild(a11y);

  var panel = a11y.querySelector(".a11y__panel");
  var aBtn = a11y.querySelector(".a11y__btn");
  function syncUI() {
    a11y.querySelector("[data-fs-val]").textContent = prefs.fs;
    a11y.querySelector('[data-fs="-"]').disabled = prefs.fs <= 100;
    a11y.querySelector('[data-fs="+"]').disabled = prefs.fs >= 150;
    ["hc", "rm"].forEach(function (k) {
      var b = a11y.querySelector('[data-toggle="' + k + '"]');
      b.setAttribute("aria-pressed", prefs[k] ? "true" : "false");
      b.textContent = prefs[k] ? "An" : "Aus";
    });
  }
  function openPanel(open) {
    panel.hidden = !open;
    aBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) a11y.querySelector(".a11y__opt:not(:disabled)").focus();
  }
  aBtn.addEventListener("click", function () { openPanel(panel.hidden); });
  a11y.addEventListener("click", function (e) {
    var fs = e.target.closest("button[data-fs]"), tg = e.target.closest("button[data-toggle]");
    if (fs) { prefs.fs = Math.max(100, Math.min(150, prefs.fs + (fs.dataset.fs === "+" ? 10 : -10))); }
    else if (tg) { prefs[tg.dataset.toggle] = !prefs[tg.dataset.toggle]; }
    else if (e.target.closest(".a11y__reset")) { prefs = { fs: 100, hc: false, rm: false }; }
    else return;
    applyPrefs(); syncUI();
    if (tg && tg.dataset.toggle === "rm") balloons.refresh();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) { openPanel(false); aBtn.focus(); }
  });
  document.addEventListener("click", function (e) { if (!panel.hidden && !a11y.contains(e.target)) openPanel(false); });
  applyPrefs(); syncUI();

  /* ---------- Footer: Heliumballons hinter der Wortmarke ---------- */
  var balloons = (function () {
    var wrap = document.querySelector(".balloon");
    var api = { refresh: function () {} };
    if (!wrap) return api;
    var canvas = wrap.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var COLORS = ["#feda75", "#fa7e1e", "#d62976", "#962fbf", "#4f5bd5", "#f56040", "#c13584"];
    var blobs = [], raf = 0, last = { x: -999, y: -999 }, dpr = 1, W = 0, H = 0, scale = 1, hintShown = false;

    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; scale = Math.max(.55, Math.min(1.25, W / 1300));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function shade(hex, amt) {
      var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      function c(v) { return Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt)))); }
      return "rgb(" + c(r) + "," + c(g) + "," + c(b) + ")";
    }
    function spawn(x, y, big) {
      if (blobs.length > 70) blobs.shift();
      var col = COLORS[Math.floor(Math.random() * COLORS.length)];
      blobs.push({
        x: x + (Math.random() - .5) * 26, y: y + (Math.random() - .5) * 18,
        R: (big ? 62 : 34 + Math.random() * 40) * scale,
        vx: (Math.random() - .5) * .5, vy: -(.25 + Math.random() * .55),
        ph: Math.random() * 6.28, born: performance.now(), life: 3400 + Math.random() * 2600,
        c0: shade(col, .55), c1: col, c2: shade(col, -.35)
      });
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
    function tick(now) {
      ctx.clearRect(0, 0, W, H);
      for (var i = blobs.length - 1; i >= 0; i--) {
        var b = blobs[i], age = now - b.born;
        if (age > b.life) { blobs.splice(i, 1); continue; }
        var grow = Math.min(1, age / 750), shrink = age > b.life - 700 ? (b.life - age) / 700 : 1;
        var r = b.R * easeOutBack(grow) * Math.max(0, shrink);
        b.x += b.vx + Math.sin(now / 900 + b.ph) * .25;
        b.y += b.vy; b.vy *= .998;
        if (r <= .5) continue;
        var g = ctx.createRadialGradient(b.x - r * .35, b.y - r * .45, r * .08, b.x, b.y, r * 1.1);
        g.addColorStop(0, b.c0); g.addColorStop(.5, b.c1); g.addColorStop(1, b.c2);
        ctx.fillStyle = g;
        ctx.beginPath();
        // leicht ovale Ballonform, die sanft „atmet“
        ctx.ellipse(b.x, b.y, r * (1 + Math.sin(now / 500 + b.ph) * .04), r * (1.12 + Math.cos(now / 600 + b.ph) * .04), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = blobs.length ? requestAnimationFrame(tick) : 0;
      if (!raf) ctx.clearRect(0, 0, W, H);
    }
    function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function onMove(e) {
      if (motionOff()) return;
      var p = local(e), dx = p.x - last.x, dy = p.y - last.y;
      if (dx * dx + dy * dy > 22 * 22 * scale) { spawn(p.x, p.y); last = p; }
    }
    function onDown(e) {
      if (motionOff()) return;
      var p = local(e);
      for (var k = 0; k < 6; k++) spawn(p.x + (Math.random() - .5) * 90 * scale, p.y + (Math.random() - .5) * 50 * scale, k === 0);
    }
    function hint() {
      if (hintShown || motionOff()) return;
      hintShown = true;
      var word = wrap.querySelector(".balloon__word").getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      for (var k = 0; k < 9; k++) {
        (function (k) {
          setTimeout(function () {
            spawn(word.left - cr.left + word.width * (.08 + k * .1), word.top - cr.top + word.height * (.45 + Math.sin(k) * .2), k % 3 === 0);
          }, k * 110);
        })(k);
      }
    }
    size();
    window.addEventListener("resize", size);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerdown", onDown);
    if ("IntersectionObserver" in window) {
      var hio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { hint(); hio.disconnect(); } }, { threshold: .6 });
      hio.observe(wrap);
    }
    api.refresh = function () { if (motionOff()) { blobs = []; ctx.clearRect(0, 0, W, H); } };
    return api;
  })();

  /* ---------- Kontaktformular ---------- */
  var form = document.getElementById("kontaktformular");
  if (form) {
    var statusEl = form.querySelector(".form__status");
    var startedAt = Date.now();
    var tsField = form.querySelector('[name="ts"]');
    if (tsField) tsField.value = String(Math.floor(startedAt / 1000));

    function setErr(field, msg) {
      var el = form.querySelector('[name="' + field + '"]');
      var out = form.querySelector('[data-err="' + field + '"]');
      if (el) el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (out) out.textContent = msg || "";
    }
    function validate() {
      var ok = true, first = null;
      var checks = [
        ["name", function (v) { return v.trim().length >= 2 ? "" : "Bitte gib deinen Namen an."; }],
        ["email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Bitte gib eine gültige E-Mail-Adresse an, z. B. name@firma.de."; }],
        ["nachricht", function (v) { return v.trim().length >= 10 ? "" : "Schreib mir bitte ein paar Worte zu deinem Anliegen (mind. 10 Zeichen)."; }]
      ];
      checks.forEach(function (c) {
        var el = form.querySelector('[name="' + c[0] + '"]'), msg = c[1](el.value);
        setErr(c[0], msg);
        if (msg) { ok = false; if (!first) first = el; }
      });
      var dsg = form.querySelector('[name="datenschutz"]');
      var dmsg = dsg.checked ? "" : "Bitte bestätige die Datenschutzhinweise.";
      setErr("datenschutz", dmsg);
      if (dmsg) { ok = false; if (!first) first = dsg; }
      if (first) first.focus();
      return ok;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.className = "form__status"; statusEl.textContent = "";
      if (!validate()) return;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      statusEl.textContent = "Wird gesendet …";
      fetch(form.getAttribute("action"), { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { return r.json().catch(function () { throw new Error("no-json"); }); })
        .then(function (res) {
          if (res && res.ok) {
            statusEl.className = "form__status is-ok";
            statusEl.textContent = res.message || "Danke! Deine Nachricht ist angekommen. Ich melde mich innerhalb von einem Werktag bei dir.";
            form.reset();
          } else {
            if (res && res.errors) Object.keys(res.errors).forEach(function (k) { setErr(k, res.errors[k]); });
            throw new Error((res && res.message) || "server");
          }
        })
        .catch(function (err) {
          statusEl.className = "form__status is-err";
          statusEl.textContent = (err && err.message && err.message !== "server" && err.message !== "no-json" && err.message.indexOf("fetch") === -1)
            ? err.message
            : "Die Nachricht konnte gerade nicht gesendet werden. Bitte versuch es später noch einmal oder schreib mir direkt an weigl.social@gmail.com.";
        })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* Jahr im Footer */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
