#!/usr/bin/env python3
"""
Ergaenzt die Projektkarten: neues Projekt Simultanuebersetzung, dazu
Knoepfe, die eine Bildansicht mit den Screenshots oeffnen.
Das bestehende Kartenlayout bleibt unveraendert.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SIMULTAN_DE = '''          <article class="panel">
            <span class="panel-num">01</span>
            <div class="panel-body">
              <span class="panel-cat">Live-Übersetzung · aktuelles Projekt</span>
              <h3 class="panel-title">Simultanübersetzung</h3>
              <p class="panel-desc">
                Transkribiert gesprochene Sprache in Echtzeit und übersetzt sie
                unmittelbar weiter — für Veranstaltungen, bei denen nicht alle
                dieselbe Sprache sprechen. Über ein Kontextfeld lassen sich Namen
                und Fachbegriffe vorgeben, damit die Erkennung sie richtig trifft.
              </p>
              <ul class="panel-tags"><li>Spracherkennung</li><li>Übersetzung</li><li>Echtzeit</li></ul>
              <button class="panel-shots" type="button"
                      data-shots="assets/shot-simultan.webp"
                      data-captions="Startansicht mit Sprachwahl und Kontextfeld"
                      data-title="Simultanübersetzung">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                Bild ansehen
              </button>
            </div>
          </article>

'''

SIMULTAN_EN = SIMULTAN_DE \
    .replace("Live-Übersetzung · aktuelles Projekt", "Live translation · current project") \
    .replace("Simultanübersetzung", "Simultaneous Translation") \
    .replace('''Transkribiert gesprochene Sprache in Echtzeit und übersetzt sie
                unmittelbar weiter — für Veranstaltungen, bei denen nicht alle
                dieselbe Sprache sprechen. Über ein Kontextfeld lassen sich Namen
                und Fachbegriffe vorgeben, damit die Erkennung sie richtig trifft.''',
             '''Transcribes speech in real time and translates it on the fly — for
                events where not everyone shares a language. A context field lets
                you supply names and technical terms up front, so the recognition
                gets them right.''') \
    .replace("<li>Spracherkennung</li><li>Übersetzung</li><li>Echtzeit</li>",
             "<li>Speech recognition</li><li>Translation</li><li>Real time</li>") \
    .replace("Startansicht mit Sprachwahl und Kontextfeld",
             "Start screen with language selection and context field") \
    .replace("Bild ansehen", "View image")

MCP_BUTTON_DE = '''              <button class="panel-shots" type="button"
                      data-shots="assets/shot-mcp-home.webp,assets/shot-mcp-config.webp,assets/shot-mcp-add.webp"
                      data-captions="Übersicht über Gateways und MCP-Server|Gateway-Konfiguration: Name, Standort, Sichtbarkeit|MCP-Server zu einem Gateway hinzufügen"
                      data-title="MCP Gateway">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                3 Bilder ansehen
              </button>
'''

MCP_BUTTON_EN = MCP_BUTTON_DE \
    .replace("Übersicht über Gateways und MCP-Server", "Overview of gateways and MCP servers") \
    .replace("Gateway-Konfiguration: Name, Standort, Sichtbarkeit", "Gateway configuration: name, location, visibility") \
    .replace("MCP-Server zu einem Gateway hinzufügen", "Adding an MCP server to a gateway") \
    .replace("3 Bilder ansehen", "View 3 images")

VIEW_DE = '''
    <!-- Bildansicht eines Projekts -->
    <div class="shots-view" role="dialog" aria-modal="true" aria-label="Projektbilder" hidden>
      <button class="shots-close" type="button" aria-label="Schliessen">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <figure class="shots-figure">
        <img class="shots-img" alt="">
        <figcaption class="shots-caption"></figcaption>
      </figure>
      <div class="shots-bar">
        <p class="shots-title"></p>
        <div class="shots-nav">
          <button class="shots-prev" type="button" aria-label="Vorheriges Bild">←</button>
          <span class="shots-count"></span>
          <button class="shots-next" type="button" aria-label="Nächstes Bild">→</button>
        </div>
      </div>
    </div>
'''

VIEW_EN = VIEW_DE \
    .replace("Bildansicht eines Projekts", "Project image viewer") \
    .replace('aria-label="Projektbilder"', 'aria-label="Project images"') \
    .replace('aria-label="Schliessen"', 'aria-label="Close"') \
    .replace('aria-label="Vorheriges Bild"', 'aria-label="Previous image"') \
    .replace('aria-label="Nächstes Bild"', 'aria-label="Next image"')


def bearbeite(datei: str, simultan: str, mcp_btn: str, view: str, mcp_cat: str) -> None:
    p = ROOT / datei
    t = p.read_text(encoding="utf-8")

    # 1. Nummern der bestehenden Karten um eins erhoehen (von hinten nach vorne)
    for alt, neu in [("05", "06"), ("04", "05"), ("03", "04"), ("02", "03"), ("01", "02")]:
        t = t.replace(f'<span class="panel-num">{alt}</span>',
                      f'<span class="panel-num">§{neu}§</span>')
    t = t.replace("§", "")

    # 2. Simultan-Karte vor der ersten bestehenden Karte einfuegen
    marke = '          <article class="panel">\n            <span class="panel-num">02</span>'
    assert marke in t, f"{datei}: Einfuegemarke nicht gefunden"
    t = t.replace(marke, simultan + marke, 1)

    # 3. Bild-Knopf in die MCP-Karte
    anker = f'              <ul class="panel-tags"><li>Go</li><li>gRPC</li><li>Next.js</li><li>TypeScript</li></ul>\n'
    assert anker in t, f"{datei}: MCP-Tags nicht gefunden"
    t = t.replace(anker, anker + mcp_btn, 1)

    # 4. Zaehler anpassen
    t = t.replace("</span> / 05</span>", "</span> / 06</span>")

    # 5. Bildansicht vor dem Ende von <main> einfuegen
    t = t.replace("\n  </main>", view + "\n  </main>", 1)

    p.write_text(t, encoding="utf-8")
    print(f"{datei}: Simultan-Karte, MCP-Bildknopf und Bildansicht ergaenzt")


bearbeite("index.html", SIMULTAN_DE, MCP_BUTTON_DE, VIEW_DE, "Go · Next.js · Full-Stack")
bearbeite("en.html", SIMULTAN_EN, MCP_BUTTON_EN, VIEW_EN, "Go · Next.js · Full-stack")
