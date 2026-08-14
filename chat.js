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
          "What did he build at Swisscom?"
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
          "Was hat er bei Swisscom gebaut?"
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

  var history = [];
  var busy = false;
  var started = false;
  var lastFocus = null;

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
    if (input.value || document.activeElement === input) return;
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

  function updatePlaceholderVisibility() {
    var show = !input.value && document.activeElement !== input;
    placeholderEl.style.display = show ? "" : "none";
    if (show && !phTimer) startPlaceholders();
    if (!show) stopPlaceholders();
  }

  input.addEventListener("focus", updatePlaceholderVisibility);
  input.addEventListener("blur", updatePlaceholderVisibility);
  input.addEventListener("input", updatePlaceholderVisibility);

  /* ---------- Nachrichten ---------- */
  function addMessage(text, kind) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg-" + kind;
    el.textContent = text;
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
    bootstrap();
    updatePlaceholderVisibility();
    setTimeout(function () { input.focus(); }, 420);
  }

  function close() {
    root.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    if (window.__lenis) window.__lenis.start();
    document.body.style.overflow = "";
    stopPlaceholders();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    else toggle.focus();
  }

  toggle.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

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
        placeholder.textContent = answer;
        log.scrollTop = log.scrollHeight;
      }

      if (!answer.trim()) {
        placeholder.remove();
        addMessage(T.errEmpty, "error");
        setBusy(false);
        input.focus();
        return;
      }

      history.push({ role: "user", text: message });
      history.push({ role: "model", text: answer });
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
