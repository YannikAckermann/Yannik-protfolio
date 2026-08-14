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

  if (preloader && countEl && !prefersReduced) {
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
  if (track && !prefersReduced) {
    var marqueeTween = gsap.to(track, { xPercent: -50, duration: 22, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      trigger: ".marquee",
      start: "top bottom",
      end: "bottom top",
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 900, 3);
        gsap.to(marqueeTween, { timeScale: 1 + v, duration: 0.4, overwrite: true });
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
      ScrollTrigger.create({
        trigger: manifestEl,
        start: "top 78%",
        end: "bottom 45%",
        scrub: true,
        onUpdate: function (self) {
          var n = Math.floor(self.progress * words.length);
          words.forEach(function (w, i) { w.classList.toggle("on", i <= n); });
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
    var suffix = target >= 10 ? "+" : "";
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
        scrub: 1,
        pin: ".projects-pin",
        pinSpacing: true,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: function (self) {
          if (currentEl) {
            var idx = Math.min(panels.length, Math.max(1, Math.round(self.progress * (panels.length - 1)) + 1));
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
})();
