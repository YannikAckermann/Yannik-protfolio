/* Portfolio-Chatbot — Vollbild-Überlagerung, spricht mit /api/chat (Gemini) */
(function () {
  "use strict";

  var root = document.querySelector(".chat");
  if (!root) return;

  var isEN = document.documentElement.lang === "en";

  var T = isEN
    ? {
        greeting:
          "Hi! I can answer questions about Yannik — his projects, skills and availability. What would you like to know?",
        suggestions: [
          "What's his experience with AI?",
          "What is the MCP Gateway?",
          "When is he available?"
        ],
        placeholders: [
          "What's Yannik's experience with AI?",
          "What is the MCP Gateway?",
          "When is he available for a new project?",
          "Which technologies does he work with?",
          "What did he build at Swisscom?",
          "Does he know React and TypeScript?",
          "What is the Model Context Protocol?",
          "Which teams has he worked in?",
          "Does he have cloud experience?",
          "What is he learning right now?",
          "Has he worked with machine learning?",
          "What does his training involve?",
          "Which backend languages does he use?",
          "How can I get in touch with him?",
          "What does he do outside of work?"
        ],
        openLabel: "Ask about Yannik",
        errNotConfigured:
          "The chat isn't set up yet. You can reach Yannik directly at yannik.ackermann@swisscom.com.",
        errRate: "That was a lot of questions at once — please try again in a minute.",
        errBusy:
          "The AI service is briefly overloaded. Please try again in a moment — or email yannik.ackermann@swisscom.com.",
        errGeneric:
          "Something went wrong there. Please try again, or email yannik.ackermann@swisscom.com.",
        errEmpty: "No answer came back. Please try rephrasing your question."
      }
    : {
        greeting:
          "Hoi! Ich beantworte Fragen zu Yannik — seinen Projekten, Skills und seiner Verfügbarkeit. Was möchtest du wissen?",
        suggestions: [
          "Welche Erfahrung hat er mit AI?",
          "Was ist das MCP Gateway?",
          "Ab wann ist er verfügbar?"
        ],
        placeholders: [
          "Welche Erfahrung hat Yannik mit AI?",
          "Was ist das MCP Gateway?",
          "Ab wann ist er für ein neues Projekt verfügbar?",
          "Mit welchen Technologien arbeitet er?",
          "Was hat er bei Swisscom gebaut?",
          "Kann er React und TypeScript?",
          "Was ist das Model Context Protocol?",
          "In welchen Teams hat er gearbeitet?",
          "Hat er Erfahrung mit der Cloud?",
          "Woran lernt er gerade?",
          "Hat er schon mit Machine Learning gearbeitet?",
          "Wie läuft seine Ausbildung ab?",
          "Welche Backend-Sprachen nutzt er?",
          "Wie kann ich ihn erreichen?",
          "Was macht er neben der Arbeit?"
        ],
        openLabel: "Frag mich über Yannik",
        errNotConfigured:
          "Der Chat ist noch nicht eingerichtet. Du erreichst Yannik direkt unter yannik.ackermann@swisscom.com.",
        errRate: "Das waren viele Fragen auf einmal — bitte in einer Minute nochmal versuchen.",
        errBusy:
          "Der AI-Dienst ist gerade kurz überlastet. Bitte gleich nochmal versuchen — oder eine Mail an yannik.ackermann@swisscom.com.",
        errGeneric:
          "Da ist etwas schiefgelaufen. Bitte nochmal versuchen oder eine Mail an yannik.ackermann@swisscom.com.",
        errEmpty: "Es kam keine Antwort zurück. Formuliere die Frage bitte etwas anders."
      };

  var toggle = root.querySelector(".chat-toggle");
  var overlay = root.querySelector(".chat-overlay");
  var closeBtn = root.querySelector(".chat-close");
  var log = root.querySelector(".chat-log");
  var form = root.querySelector(".chat-bar");
  var input = root.querySelector(".chat-input");
  var sendBtn = root.querySelector(".chat-send");
  var chips = root.querySelector(".chat-suggestions");
  var placeholderEl = root.querySelector(".chat-placeholder");
  var robot = root.querySelector(".chat-robot");

  var history = [];
  var busy = false;
  var started = false;
  var lastFocus = null;
  var robotLoaded = false;

  /* ---------- Handlungen ----------
     Das Modell darf keine URLs vorschlagen, sondern nur eine Kennung aus dieser
     Liste nennen (siehe api/profile.js). Ziel und Beschriftung stehen hier in
     der Seite — was nicht in der Liste steht, wird verworfen. Damit kann eine
     manipulierte oder halluzinierte Antwort keinen fremden Link unterschieben. */
  function jumpTo(selector) {
    return function () {
      var target = document.querySelector(selector);
      close({ keepFocus: true });
      if (!target) return;
      // Erst nach dem Schliessen scrollen: Lenis ist vorher gestoppt.
      setTimeout(function () {
        if (window.__lenis) window.__lenis.scrollTo(target, { offset: 0 });
        else target.scrollIntoView({ behavior: "smooth" });
      }, 60);
    };
  }

  function openShots(key) {
    return function () {
      var fig = document.querySelector('.panel-media-shot[data-key="' + key + '"]');
      if (!fig) return;
      close({ keepFocus: true });
      // Der Klick geht an den Handler in script.js, der die Bildansicht oeffnet.
      setTimeout(function () { fig.click(); }, 120);
    };
  }

  function openLink(url) {
    return function () { window.open(url, "_blank", "noopener"); };
  }

  var ACTIONS = {
    mcp_live: {
      de: "MCP Gateway öffnen",
      en: "Open MCP Gateway",
      note_de: "nur im Swisscom-Netz",
      note_en: "Swisscom network only",
      run: openLink("https://mcp-gateway-frontend.dev-scapp-corp.swisscom.com/de")
    },
    github_ml: {
      de: "Repository ansehen",
      en: "View repository",
      run: openLink("https://github.com/YannikAckermann/Country-prediction")
    },
    github: {
      de: "GitHub-Profil",
      en: "GitHub profile",
      run: openLink("https://github.com/YannikAckermann")
    },
    linkedin: {
      de: "LinkedIn-Profil",
      en: "LinkedIn profile",
      run: openLink("https://www.linkedin.com/in/yannik-ackermann-5a3a10322/")
    },
    mail: {
      de: "E-Mail schreiben",
      en: "Write an email",
      run: openLink(
        "mailto:yannik.ackermann@swisscom.com?subject=" +
          encodeURIComponent(isEN ? "Project enquiry" : "Projektanfrage")
      )
    },
    shots_mcp: {
      de: "Bilder vom MCP Gateway",
      en: "MCP Gateway screenshots",
      run: openShots("mcp")
    },
    shots_simultan: {
      de: "Bilder der Simultanübersetzung",
      en: "Live translation screenshots",
      run: openShots("simultan")
    },
    goto_projects: { de: "Zu den Projekten", en: "Go to projects", run: jumpTo("#projekte") },
    goto_exp: { de: "Zum Werdegang", en: "Go to career", run: jumpTo("#erfahrung") },
    goto_about: { de: "Zu «Über mich»", en: "Go to «About»", run: jumpTo("#manifest") },
    goto_contact: { de: "Zum Kontakt", en: "Go to contact", run: jumpTo("#kontakt") }
  };

  // Das Modell haengt am Ende eine Zeile "[[actions: id, id]]" an.
  var ACTION_LINE = /\[\[\s*actions?\s*:([^\]]*)\]\]/i;
  // Waehrend des Streamens taucht die Zeile zeichenweise auf — der angefangene
  // Marker darf nicht kurz als Text aufblitzen.
  var ACTION_PARTIAL = /\n*\[\[?[^\]]*$/;

  function splitActions(text) {
    var ids = [];
    var body = String(text).replace(ACTION_LINE, function (_, list) {
      list.split(",").forEach(function (raw) {
        var id = raw.trim().toLowerCase();
        if (ACTIONS[id] && ids.indexOf(id) === -1) ids.push(id);
      });
      return "";
    });
    return { text: body.trim(), ids: ids.slice(0, 3) };
  }

  function renderActions(container, ids) {
    if (!ids.length) return;
    var box = document.createElement("div");
    box.className = "chat-actions";
    ids.forEach(function (id) {
      var a = ACTIONS[id];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chat-action";
      b.innerHTML =
        '<span class="chat-action-label"></span>' +
        '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" ' +
        'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M3 8h10M9 4l4 4-4 4"/></svg>';
      b.querySelector(".chat-action-label").textContent = isEN ? a.en : a.de;
      var note = isEN ? a.note_en : a.note_de;
      if (note) {
        var s = document.createElement("small");
        s.textContent = note;
        b.querySelector(".chat-action-label").appendChild(s);
      }
      b.addEventListener("click", a.run);
      box.appendChild(b);
    });
    container.appendChild(box);
  }

  /* ---------- 3D-Roboter ----------
     Nur der Roboter (Spline-Szene) — kein Card/Spotlight-Rahmen. Der schwere
     Spline-Runtime wird erst beim ersten Oeffnen des Chats geladen, damit der
     Seitenaufbau nicht ausgebremst wird. Auf dem Handy bleibt er ganz aus. */
  function loadRobot() {
    if (robotLoaded || !robot) return;
    if (window.matchMedia("(max-width: 860px)").matches) return;
    robotLoaded = true;

    var viewer = document.createElement("spline-viewer");
    viewer.setAttribute("url", "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode");
    viewer.setAttribute("loading-anim-type", "none");
    robot.appendChild(viewer);

    if (!document.querySelector('script[data-spline-viewer]')) {
      var s = document.createElement("script");
      s.type = "module";
      s.src = "https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js";
      s.setAttribute("data-spline-viewer", "");
      document.head.appendChild(s);
    }

    // Spline-Wasserzeichen im Shadow-DOM ausblenden, sobald es existiert.
    var tries = 0;
    var hideLogo = setInterval(function () {
      var logo = viewer.shadowRoot && viewer.shadowRoot.querySelector("#logo");
      if (logo) { logo.style.display = "none"; clearInterval(hideLogo); }
      if (++tries > 40) clearInterval(hideLogo);
    }, 250);
  }

  var hint = toggle.querySelector(".chat-toggle-hint");
  if (hint) hint.textContent = T.openLabel;

  /* ---------- Animierter Platzhalter ---------- */
  var phIndex = 0;
  var phTimer = null;

  function renderPlaceholder(text) {
    placeholderEl.classList.remove("out");
    placeholderEl.textContent = "";
    text.split("").forEach(function (c, i) {
      var s = document.createElement("span");
      s.className = "ch";
      s.textContent = c === " " ? " " : c;
      s.style.animationDelay = i * 0.025 + "s";
      placeholderEl.appendChild(s);
    });
  }

  function hidePlaceholder() {
    placeholderEl.classList.add("out");
    [].forEach.call(placeholderEl.children, function (el, i) {
      el.style.animationDelay = i * 0.015 + "s";
    });
  }

  function cyclePlaceholder() {
    if (input.value) return;
    hidePlaceholder();
    setTimeout(function () {
      phIndex = (phIndex + 1) % T.placeholders.length;
      renderPlaceholder(T.placeholders[phIndex]);
    }, 420);
  }

  function startPlaceholders() {
    renderPlaceholder(T.placeholders[phIndex]);
    stopPlaceholders();
    phTimer = setInterval(cyclePlaceholder, 3400);
  }

  function stopPlaceholders() {
    if (phTimer) clearInterval(phTimer);
    phTimer = null;
  }

  // Die Fragen laufen weiter, solange nichts getippt ist — auch bei Fokus,
  // sonst waeren sie nach dem Oeffnen sofort weg (der Eingabe wird fokussiert).
  function updatePlaceholderVisibility() {
    var show = !input.value;
    placeholderEl.style.display = show ? "" : "none";
    if (show && !phTimer) startPlaceholders();
    if (!show) stopPlaceholders();
  }

  input.addEventListener("input", updatePlaceholderVisibility);

  /* ---------- Markdown ----------
     Bewusst minimal und sicher: der Text wird zuerst vollstaendig escaped,
     erst danach werden die erlaubten Auszeichnungen wieder zu HTML. So kann
     aus der Modellantwort kein Markup in die Seite gelangen. */
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inline(s) {
    return escapeHtml(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
      // Nur http/https verlinken — keine javascript:-URLs
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function renderMarkdown(text) {
    var lines = String(text).split("\n");
    var html = "";
    var list = null;              // "ul" | "ol" | null

    function closeList() {
      if (list) { html += "</" + list + ">"; list = null; }
    }

    lines.forEach(function (line) {
      var bullet = line.match(/^\s*[-*]\s+(.*)$/);
      var numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

      if (bullet) {
        if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; }
        html += "<li>" + inline(bullet[1]) + "</li>";
      } else if (numbered) {
        if (list !== "ol") { closeList(); html += "<ol>"; list = "ol"; }
        html += "<li>" + inline(numbered[1]) + "</li>";
      } else if (line.trim() === "") {
        closeList();
      } else {
        closeList();
        html += "<p>" + inline(line) + "</p>";
      }
    });

    closeList();
    return html;
  }

  /* ---------- Nachrichten ---------- */
  function addMessage(text, kind) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg-" + kind;
    if (kind === "bot") el.innerHTML = renderMarkdown(text);
    else el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function addTyping() {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg-bot";
    el.innerHTML = '<span class="chat-typing"><span></span><span></span><span></span></span>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function renderSuggestions() {
    chips.innerHTML = "";
    T.suggestions.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chat-chip";
      b.textContent = q;
      b.addEventListener("click", function () {
        chips.innerHTML = "";
        send(q);
      });
      chips.appendChild(b);
    });
  }

  function bootstrap() {
    if (started) return;
    started = true;
    addMessage(T.greeting, "bot");
    renderSuggestions();
  }

  /* ---------- Öffnen / Schliessen ---------- */
  function open() {
    lastFocus = document.activeElement;
    root.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    // Seite hinter der Überlagerung ruhigstellen
    if (window.__lenis) window.__lenis.stop();
    document.body.style.overflow = "hidden";
    loadRobot();
    bootstrap();
    updatePlaceholderVisibility();
    setTimeout(function () { input.focus(); }, 420);
  }

  // opts.keepFocus: beim Sprung zu einem Abschnitt nicht zurueck auf den
  // Auslöser fokussieren — das wuerde die Seite sofort wieder hochziehen.
  function close(opts) {
    root.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    if (window.__lenis) window.__lenis.start();
    document.body.style.overflow = "";
    stopPlaceholders();
    if (opts && opts.keepFocus) return;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    else toggle.focus();
  }

  toggle.addEventListener("click", open);
  closeBtn.addEventListener("click", function () { close(); });

  // Klick auf den unscharfen Hintergrund schliesst ebenfalls
  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("open")) close();
  });

  /* ---------- Senden & Streamen ---------- */
  function setBusy(state) {
    busy = state;
    sendBtn.disabled = state;
    input.disabled = state;
  }

  async function send(text) {
    if (busy) return;
    var message = String(text || "").trim();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";
    updatePlaceholderVisibility();
    setBusy(true);

    var placeholder = addTyping();
    var answer = "";

    try {
      var res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: message,
          history: history,
          lang: isEN ? "en" : "de"
        })
      });

      if (!res.ok) {
        var reason = T.errGeneric;
        var payload = await res.json().catch(function () { return {}; });
        if (res.status === 503 && payload.error === "not_configured") reason = T.errNotConfigured;
        else if (res.status === 503) reason = T.errBusy;
        else if (res.status === 429) reason = T.errRate;
        placeholder.remove();
        addMessage(reason, "error");
        setBusy(false);
        input.focus();
        return;
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var first = true;

      for (;;) {
        var chunk = await reader.read();
        if (chunk.done) break;
        var piece = decoder.decode(chunk.value, { stream: true });
        if (!piece) continue;
        if (first) {
          placeholder.textContent = "";
          first = false;
        }
        answer += piece;
        // Waehrend des Streamens Klartext — halbfertiges Markdown wuerde sonst
        // flackern (offene ** usw.). Formatiert wird am Ende einmal sauber.
        // Der Handlungs-Marker am Ende wird schon hier weggeschnitten, auch
        // wenn erst ein Teil davon angekommen ist.
        placeholder.textContent = splitActions(answer).text.replace(ACTION_PARTIAL, "");
        log.scrollTop = log.scrollHeight;
      }

      var result = splitActions(answer);

      if (!result.text) {
        placeholder.remove();
        addMessage(T.errEmpty, "error");
        setBusy(false);
        input.focus();
        return;
      }

      placeholder.innerHTML = renderMarkdown(result.text);
      renderActions(placeholder, result.ids);
      log.scrollTop = log.scrollHeight;

      // Ohne Marker in den Verlauf — sonst ahmt das Modell die alte Auswahl nach.
      history.push({ role: "user", text: message });
      history.push({ role: "model", text: result.text });
      if (history.length > 8) history = history.slice(-8);
    } catch (err) {
      placeholder.remove();
      addMessage(T.errGeneric, "error");
    }

    setBusy(false);
    input.focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    chips.innerHTML = "";
    send(input.value);
  });
})();
