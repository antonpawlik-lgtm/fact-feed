# Factly

Mobiler, TikTok-artiger Scroll-Feed mit Fun Facts. Vertikal scrollen = nächster Fact, horizontal swipen = liken/disliken. Reine statische Seite (kein Backend), Vorlieben werden nur lokal im Browser (`localStorage`) gespeichert — auf zwei Ebenen: pro Kategorie (`factly_categoryStats`) und pro Tag/Unterthema (`factly_tagStats`).

## Lokal öffnen

```
cd factly
python3 -m http.server 8080
```
Dann `http://localhost:8080` öffnen (ein simpler statischer Server ist nötig, damit `fetch('facts.json')` und die ES-Module funktionieren — direktes Öffnen der `index.html` per `file://` scheitert an CORS-Restriktionen).

## News-Pipeline

Ein GitHub-Actions-Workflow (`.github/workflows/update-news.yml`) holt alle 3 Stunden RSS-Feeds (Tagesschau, Heise, Golem, BBC World/Tech, Ars Technica), schreibt `news.json` und committet sie — die Seite bleibt dabei komplett statisch. Der Client mischt daraus ~jede 8. Karte eine News in den Feed (`NEWS_RATE` in `src/main.js`). Fällt `news.json` aus oder ist älter als 48h, zeigt der Feed unauffällig nur Facts.

- Feed ergänzen/ersetzen: `NEWS_SOURCES` in `.github/scripts/fetch-news.mjs` (lang, topic, source, url).
- Lokal testen: `npm run fetch:news && npm run validate:news`.
- Manuell anstoßen: `gh workflow run update-news.yml`.

## Struktur & Tests

- `src/main.js` — App (DOM, Gesten, Views, Boot), lädt als natives ES-Modul.
- `src/recommender.js`, `src/reactions.js`, `src/storage.js` — reine, getestete Logik.
- `sw.js` — Service Worker (App offline nutzbar; `facts.json` network-first, Rest cache-first). **Bei Änderungen an `src/*.js`/`style.css` sowohl die `?v=`-Nummern in `index.html` als auch die `CACHE`-Version in `sw.js` hochzählen.**
- Tests: `npm test` (node --test, keine Dependencies).

## Wöchentliches Update (neue Facts hinzufügen)

1. `facts.json` öffnen, aktuelle höchste `id` ermitteln (steht auch am Ende der Validierungsausgabe, siehe unten).
2. Neue Fact-Objekte anhängen, `id` fortlaufend ab der höchsten + 1, z.B.:
   ```json
   { "id": 181, "category": "history", "lang": "de", "text": "...", "textAlt": "... (Übersetzung in der jeweils anderen Sprache)", "source": null, "tags": ["dinosaurs", "fossils"] }
   ```
   Kategorien frei aus der bestehenden Liste wiederverwenden (science, history, nature, space, animals, geography, technology, psychology, food, curiosities), `lang` ist `"de"` oder `"en"`.

   **Tags** (Pflicht, 1–3 pro Fact): feingranulare Unterthemen, auf denen der Algorithmus zusätzlich zur Kategorie lernt. Konvention: englisch, lowercase, Bindestriche statt Leerzeichen (`ancient-rome`), Plural bei zählbaren Nomen (`dinosaurs`), spezifischster Tag zuerst, Kategorie nicht als Tag wiederholen. **Vorhandene Tags wiederverwenden statt Synonyme zu erfinden** — die aktuelle Tag-Liste zeigt `node validate-facts.js`. Tags dürfen quer über Kategorien genutzt werden (z.B. `dinosaurs` auf History- und Nature-Facts).

   **Quelle** (optional, aber erwünscht): Wenn eine belastbare Quelle vorliegt, statt `"source": null` ein Objekt eintragen — es erscheint dann als Link auf der Karte:
   ```json
   "source": { "url": "https://...", "publisher": "NASA", "title": "Lightning Facts" },
   "verifiedAt": "2026-07-18"
   ```
   Die 180 Bestands-Facts haben noch keine Quellen; die werden in einer eigenen Recherche-Session nachgetragen.
3. Validieren:
   ```
   node validate-facts.js
   ```
   Prüft: valides JSON, keine doppelten IDs, erlaubte Kategorie, erlaubte Sprache, nicht-leerer Text, gültige Tags (1–3, Format, keine Duplikate) — und zeigt eine Zusammenfassung nach Kategorie/Sprache/Tag, warnt bei Tags mit nur einem Fact (mögliches Synonym/Tippfehler) und nennt die nächste freie ID.
4. Bei grünem Validierungslauf deployen:
   ```
   git add facts.json
   git commit -m "Add new facts"
   git push
   ```
   GitHub Pages baut daraufhin automatisch neu.

## Deployment

Läuft über GitHub Pages auf `main`/Root: https://antonpawlik-lgtm.github.io/factly/. Auf dem iPhone über Safari "Zum Home-Bildschirm hinzufügen" für ein App-artiges Icon.

## Lizenz

Alle Rechte vorbehalten, siehe [LICENSE](LICENSE). Der Code ist öffentlich einsehbar, aber nicht zur Nutzung freigegeben.
