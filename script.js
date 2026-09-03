/* Yannik Ackermann — Portfolio (Light Minimalist Edition) */
(function () {
  "use strict";

  // Reload startet immer oben — passend zum Preloader-Intro,
  // und verhindert Chromes späte Scroll-Restauration nach dem Bilder-Laden
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Helpers ---------- */
  function splitChars(el) {
    var text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-hidden", "true");
    text.split("").forEach(function (c) {
      var s = document.createElement("span");
      s.className = "ch";
      s.innerHTML = c === " " || c === " " ? "&nbsp;" : c;
      el.appendChild(s);
    });
    return el.querySelectorAll(".ch");
  }

  function splitWords(el) {
    var text = el.textContent.replace(/\s+/g, " ").trim();
    el.textContent = "";
    text.split(" ").forEach(function (w) {
      var s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      el.appendChild(s);
      el.appendChild(document.createTextNode(" "));
    });
    return el.querySelectorAll(".w");
  }

  function showEverything() {
    document.querySelectorAll(".preloader").forEach(function (el) { el.style.display = "none"; });
    document.querySelectorAll(".manifest-text .w").forEach(function (el) { el.classList.add("on"); });
  }

  if (!hasGsap || prefersReduced) {
    showEverything();
    if (!hasGsap) {
      // Menü-Overlay muss auch ohne GSAP funktionieren
      wireMenu();
      return;
    }
  }

  /* ---------- Burger / Overlay ---------- */
  function wireMenu() {
    var burger = document.querySelector(".h-burger");
    var overlay = document.querySelector(".menu-overlay");
    if (!burger || !overlay) return;
    function close() {
      burger.classList.remove("open");
      overlay.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      overlay.setAttribute("aria-hidden", "true");
    }
    burger.addEventListener("click", function () {
      var open = !overlay.classList.contains("open");
      burger.classList.toggle("open", open);
      overlay.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      overlay.setAttribute("aria-hidden", String(!open));
    });
    overlay.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });
  }
  wireMenu();

  /* ---------- Lenis ---------- */
  var lenis = null;
  if (typeof Lenis !== "undefined" && !prefersReduced) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    // Pin-Spacer von ScrollTrigger verändert die Seitenhöhe — Lenis-Limit nachziehen
    ScrollTrigger.addEventListener("refresh", function () { lenis.resize(); });
  }

  /* ---------- Anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView();
    });
  });

  /* ---------- Header scrolled state ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    ScrollTrigger.create({
      start: 60,
      onUpdate: function (self) { header.classList.toggle("scrolled", self.scroll() > 60); },
      onToggle: function (self) { header.classList.toggle("scrolled", self.scroll() > 60); }
    });
  }

  /* ---------- Progress ---------- */
  gsap.to(".progress-bar", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 }
  });

  /* ---------- Split contact chars ---------- */
  document.querySelectorAll("[data-chars]").forEach(function (el) { splitChars(el); });

  /* ---------- Hero-Entrance (Port der framer-motion-Choreografie) ---------- */
  var heroEls = {
    logo: document.querySelector(".h-logo"),
    burger: document.querySelector(".h-burger"),
    circle: document.querySelector(".hero-circle"),
    img: document.querySelector(".hero-img"),
    left: document.querySelector(".hero-left"),
    right: document.querySelector(".hero-right"),
    footer: document.querySelectorAll(".hero-socials, .hero-location")
  };

  function heroIn() {
    var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    // framer: logo x:-20 dur .5 | circle scale .8 dur .8 delay .2 | img y:50 dur 1 delay .4
    // texte delay 1 / 1.2 | footer delay 1.2 / 1.3 — hier relativ nachgebaut
    tl.fromTo(heroEls.logo, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0)
      .fromTo(heroEls.burger, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.1)
      .fromTo(heroEls.circle, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 0.92, duration: 0.8, ease: "expo.out" }, 0.2)
      .fromTo(heroEls.img, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: "expo.out" }, 0.4)
      .fromTo(heroEls.left, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 1.0)
      .fromTo(heroEls.right, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 1.2)
      .fromTo(heroEls.footer, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, 1.2);
    return tl;
  }

  /* ---------- Preloader ---------- */
  var preloader = document.querySelector(".preloader");
  var countEl = document.querySelector(".preloader-count");

  // Beim Sprachwechsel kommt man schon durch den Vorhang — dann noch die
  // Ladeanimation mit dem Logo zu zeigen, waere doppelt. Die Marke setzt der
  // Vorhang kurz vor dem Wechsel, hier wird sie gelesen und gleich geloescht,
  // damit ein normaler Neuaufbau die Animation wieder bekommt.
  var vomSprachwechsel = false;
  try {
    vomSprachwechsel = sessionStorage.getItem("sprachwechsel") === "1";
    if (vomSprachwechsel) sessionStorage.removeItem("sprachwechsel");
  } catch (e) { /* sessionStorage gesperrt — dann laeuft die Animation eben */ }

  if (preloader && vomSprachwechsel) {
    preloader.style.display = "none";
    if (!prefersReduced) heroIn();
  } else if (preloader && countEl && !prefersReduced) {
    gsap.set([heroEls.logo, heroEls.burger, heroEls.circle, heroEls.img, heroEls.left, heroEls.right], { opacity: 0 });
    gsap.set(heroEls.footer, { opacity: 0 });
    var preLogo = preloader.querySelector(".preloader-logo");
    var counter = { v: 0 };
    var tl = gsap.timeline();
    // Logo blendet weich ein, atmet kurz und zieht dann mit dem Vorhang nach oben
    tl.fromTo(preLogo,
      { opacity: 0, scale: 0.82, filter: "blur(10px)" },
      { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.9, ease: "power3.out" }, 0)
      .to(counter, {
        v: 100,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: function () { countEl.textContent = Math.round(counter.v); }
      }, 0)
      .to(preLogo, { scale: 1.04, duration: 0.5, ease: "power1.inOut" }, 1.0)
      .to(preLogo, { yPercent: -40, opacity: 0, duration: 0.5, ease: "power3.in" }, 1.55)
      .to(preloader, {
        yPercent: -100,
        duration: 0.75,
        ease: "power4.inOut",
        onComplete: function () { preloader.style.display = "none"; }
      }, 1.7)
      .add(heroIn, "-=0.3");
  } else if (preloader) {
    preloader.style.display = "none";
  }

  /* ---------- Marquee ---------- */
  var track = document.querySelector(".marquee-track");
  var marqueeZiel = 1;
  if (track && !prefersReduced) {
    var marqueeTween = gsap.to(track, { xPercent: -50, duration: 22, ease: "none", repeat: -1 });
    // Ein Ticker statt eines Tweens pro Frame: naehert timeScale weich an.
    gsap.ticker.add(function () {
      marqueeZiel += (1 - marqueeZiel) * 0.04;   // ohne Scrollen zurueck auf 1
      var ist = marqueeTween.timeScale();
      if (Math.abs(marqueeZiel - ist) < 0.005) return;
      marqueeTween.timeScale(ist + (marqueeZiel - ist) * 0.12);
    });
    ScrollTrigger.create({
      trigger: ".marquee",
      start: "top bottom",
      end: "bottom top",
      // timeScale direkt setzen statt pro Scroll-Frame einen neuen Tween zu
      // bauen (gemessen 0.049 ms -> 0.007 ms). Der Wert wird selbst geglaettet,
      // damit die Beschleunigung trotzdem weich bleibt.
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 900, 3);
        marqueeZiel = 1 + v;
      }
    });
  }

  /* ---------- Manifest word reveal ---------- */
  var manifestEl = document.querySelector(".manifest-text");
  if (manifestEl) {
    var words = splitWords(manifestEl);
    if (prefersReduced) {
      words.forEach(function (w) { w.classList.add("on"); });
    } else {
      // Nur die Woerter anfassen, die sich seit dem letzten Frame geaendert
      // haben. Vorher lief bei jedem Scroll-Frame eine Schleife ueber alle
      // 37 Woerter — gemessen 0.113 ms statt 0.003 ms pro Frame.
      var letztes = -1;
      ScrollTrigger.create({
        trigger: manifestEl,
        start: "top 78%",
        end: "bottom 45%",
        scrub: true,
        onUpdate: function (self) {
          var n = Math.floor(self.progress * words.length);
          if (n === letztes) return;
          var i;
          if (n > letztes) for (i = letztes + 1; i <= n; i++) { if (words[i]) words[i].classList.add("on"); }
          else for (i = letztes; i > n; i--) { if (words[i]) words[i].classList.remove("on"); }
          letztes = n;
        }
      });
    }
  }

  /* ---------- Bild-Parallax ---------- */
  if (!prefersReduced) {
    document.querySelectorAll("[data-parallax]").forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6,
        ease: "none",
        scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: 1 }
      });
    });
  }

  /* ---------- Counters ---------- */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    // Suffix explizit per data-suffix — nicht aus der Groesse raten, sonst
    // wuerde aus 33 gefuehrten Lernenden ein irrefuehrendes "33+".
    var suffix = el.getAttribute("data-suffix") || "";
    if (prefersReduced) { el.textContent = target + suffix; return; }
    var obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: function () {
        gsap.to(obj, {
          v: target,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
        });
      }
    });
  });

  /* ---------- Reveals ---------- */
  if (!prefersReduced) {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 48 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true }
        }
      );
    });
  }

  /* ---------- Projects: horizontal ---------- */
  var projTrack = document.querySelector(".projects-track");
  var panels = gsap.utils.toArray(".panel");
  var currentEl = document.querySelector(".projects-current");

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  if (projTrack && !prefersReduced && window.innerWidth > 900) {
    var getDist = function () { return projTrack.scrollWidth - window.innerWidth + 80; };

    gsap.to(projTrack, {
      x: function () { return -getDist(); },
      ease: "none",
      scrollTrigger: {
        trigger: ".projects",
        start: "top top",
        end: function () { return "+=" + getDist(); },
        scrub: 0.6,
        pin: ".projects-pin",
        pinSpacing: true,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: function (self) {
          if (currentEl) {
            var total = Math.max(1, panels.length - 1);
            var idx = Math.min(total, Math.max(1, Math.round(self.progress * total)));
            currentEl.textContent = pad2(idx);
          }
        }
      }
    });
  } else if (projTrack) {
    // Mobile / Reduced Motion: vertikal stapeln
    projTrack.style.flexDirection = "column";
    projTrack.style.width = "auto";
    projTrack.style.height = "auto";
    projTrack.style.paddingRight = "var(--pad)";
    var pin = document.querySelector(".projects-pin");
    pin.style.height = "auto";
    pin.style.overflow = "visible";
    pin.style.paddingBottom = "60px";
    panels.forEach(function (p) {
      p.style.width = "auto";
      p.style.marginRight = "0";
      p.style.marginBottom = "20px";
    });
  }

  /* ---------- Bildansicht der Projekte ---------- */
  (function () {
    var view = document.querySelector(".shots-view");
    var knoepfe = document.querySelectorAll(".panel-shots");
    var previews = document.querySelectorAll(".panel-media-shot");
    if (!view) return;

    var bild = view.querySelector(".shots-img");
    var bildunterschrift = view.querySelector(".shots-caption");
    var titel = view.querySelector(".shots-title");
    var zaehler = view.querySelector(".shots-count");
    var zurueck = view.querySelector(".shots-prev");
    var weiter = view.querySelector(".shots-next");
    var schliessen = view.querySelector(".shots-close");

    var bilder = [];
    var texte = [];
    var index = 0;
    var letzterFokus = null;

    function zeige(i) {
      index = Math.max(0, Math.min(bilder.length - 1, i));
      bild.src = bilder[index];
      bild.alt = texte[index] || "";
      bildunterschrift.textContent = texte[index] || "";
      zaehler.textContent = (index + 1) + " / " + bilder.length;
      zurueck.disabled = index === 0;
      weiter.disabled = index === bilder.length - 1;
    }

    function oeffne(source, trigger) {
      bilder = (source.dataset.shots || "").split(",").filter(Boolean);
      texte = (source.dataset.captions || "").split("|");
      if (!bilder.length) return;

      letzterFokus = document.activeElement;
      titel.textContent = source.dataset.title || "";
      view.classList.toggle("single", bilder.length === 1);
      zeige(0);

      if (trigger) {
        var rect = trigger.getBoundingClientRect();
        view.style.setProperty("--shot-origin-x", (rect.left + rect.width / 2) + "px");
        view.style.setProperty("--shot-origin-y", (rect.top + rect.height / 2) + "px");
      }

      view.hidden = false;
      // Umbruch erzwingen statt requestAnimationFrame: das laeuft in
      // Hintergrund-Tabs nicht und die Ansicht bliebe unsichtbar.
      void view.offsetHeight;
      view.classList.add("open");

      if (window.__lenis) window.__lenis.stop();
      document.body.style.overflow = "hidden";
      setTimeout(function () { schliessen.focus(); }, 250);
    }

    function schliesse() {
      view.classList.remove("open");
      if (window.__lenis) window.__lenis.start();
      document.body.style.overflow = "";
      setTimeout(function () { view.hidden = true; }, 350);
      if (letzterFokus && letzterFokus.focus) letzterFokus.focus();
    }

    knoepfe.forEach(function (btn) {
      btn.addEventListener("click", function () { oeffne(btn, btn); });
    });

    previews.forEach(function (preview) {
      var btn = preview.closest(".panel") && preview.closest(".panel").querySelector(".panel-shots");
      var source = btn || preview;
      if (!source.dataset.shots) return;
      preview.tabIndex = 0;
      preview.setAttribute("role", "button");
      preview.setAttribute("data-hint", document.documentElement.lang === "en" ? "Open image" : "Bild öffnen");
      preview.setAttribute("aria-label", source.dataset.title + " öffnen");
      preview.addEventListener("click", function () { oeffne(source, preview); });
      preview.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          oeffne(source, preview);
        }
      });
    });

    zurueck.addEventListener("click", function () { zeige(index - 1); });
    weiter.addEventListener("click", function () { zeige(index + 1); });
    schliessen.addEventListener("click", schliesse);

    view.addEventListener("mousedown", function (e) {
      if (e.target === view) schliesse();
    });

    document.addEventListener("keydown", function (e) {
      if (view.hidden) return;
      if (e.key === "Escape") schliesse();
      else if (e.key === "ArrowLeft") zeige(index - 1);
      else if (e.key === "ArrowRight") zeige(index + 1);
    });
  })();

  /* ---------- Contact reveal ---------- */
  var contactChars = document.querySelectorAll(".contact-giant .ch");
  if (contactChars.length && !prefersReduced) {
    gsap.fromTo(contactChars,
      { yPercent: 110 },
      {
        yPercent: 0, duration: 0.8, stagger: 0.035, ease: "power4.out",
        scrollTrigger: { trigger: ".contact", start: "top 65%", once: true }
      }
    );
    gsap.fromTo(".contact-circle",
      { scale: 0.6, opacity: 0 },
      {
        scale: 1, opacity: 0.9, duration: 0.9, ease: "expo.out",
        scrollTrigger: { trigger: ".contact", start: "top 65%", once: true }
      }
    );
  }

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* ---------- Eigener Cursor ----------
     Punkt folgt sofort, Ring zieht weich nach. Nur bei echter Maus, und
     nicht bei prefers-reduced-motion. Laeuft auf requestAnimationFrame und
     schreibt nur transform — also reines Kompositionieren, kein Umbruch. */
  (function () {
    var dot = document.querySelector(".cursor-dot");
    var ring = document.querySelector(".cursor-ring");
    if (!dot || !ring || prefersReduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var zielX = 0, zielY = 0, ringX = 0, ringY = 0, sichtbar = false;

    window.addEventListener("mousemove", function (e) {
      zielX = e.clientX;
      zielY = e.clientY;
      if (!sichtbar) {
        sichtbar = true;
        ringX = zielX; ringY = zielY;
        document.body.classList.add("cursor-on");
      }
      // Auf dunklem Grund umdrehen, sonst verschwindet der Zeiger
      var dunkel = e.target.closest && e.target.closest(".exp, .marquee, .statement");
      document.body.classList.toggle("cursor-dark", !!dunkel);
    }, { passive: true });

    document.addEventListener("mouseleave", function () {
      sichtbar = false;
      document.body.classList.remove("cursor-on");
    });

    function folge() {
      dot.style.transform = "translate3d(" + zielX + "px," + zielY + "px,0)";
      ringX += (zielX - ringX) * 0.18;
      ringY += (zielY - ringY) * 0.18;
      ring.style.transform = "translate3d(" + ringX + "px," + ringY + "px,0)";
      requestAnimationFrame(folge);
    }
    requestAnimationFrame(folge);

    // Zustaende ueber Ereignis-Delegation: gilt auch fuer spaeter eingefuegte
    // Knoepfe, etwa die Handlungsknoepfe im Chat.
    document.addEventListener("mouseover", function (e) {
      var t = e.target;
      if (!t.closest) return;
      var medium = t.closest(".panel-media-shot");
      var link = t.closest("a, button, [data-hover], .chat-action, .chat-chip");
      document.body.classList.toggle("cursor-media", !!medium);
      document.body.classList.toggle("cursor-link", !medium && !!link);
    }, { passive: true });
  })();

  /* ---------- Vorhang beim Sprachwechsel ----------
     Der Wechsel DE/EN war ein harter Seitensprung. Jetzt faehrt erst ein
     Vorhang hoch, dann wird geladen — die neue Seite startet ohnehin mit
     dem Preloader, der Uebergang bleibt also durchgehend dunkel bzw. ruhig. */
  (function () {
    var curtain = document.querySelector(".curtain");
    var lang = document.querySelector(".h-lang");
    if (!curtain || !lang) return;

    lang.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;  // neuer Tab
      e.preventDefault();
      var ziel = lang.getAttribute("href");
      // Merken, dass der Wechsel ueber den Vorhang lief: die Zielseite
      // ueberspringt dann ihre Ladeanimation.
      try { sessionStorage.setItem("sprachwechsel", "1"); } catch (e) {}
      if (prefersReduced) { window.location.href = ziel; return; }
      curtain.classList.add("up");
      setTimeout(function () { window.location.href = ziel; }, 560);
    });
  })();
})();
