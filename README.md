# Fact Feed

Mobiler, TikTok-artiger Scroll-Feed mit Fun Facts. Vertikal scrollen = nächster Fact, horizontal swipen = liken/disliken. Reine statische Seite (kein Backend), Vorlieben werden nur lokal im Browser (`localStorage`) gespeichert — auf zwei Ebenen: pro Kategorie (`factfeed_categoryStats`) und pro Tag/Unterthema (`factfeed_tagStats`).

## Lokal öffnen

```
cd fact-feed
python3 -m http.server 8080
```
Dann `http://localhost:8080` öffnen (ein simpler statischer Server ist nötig, damit `fetch('facts.json')` funktioniert — direktes Öffnen der `index.html` per `file://` scheitert an CORS-Restriktionen für `fetch`).

## Wöchentliches Update (neue Facts hinzufügen)

1. `facts.json` öffnen, aktuelle höchste `id` ermitteln (steht auch am Ende der Validierungsausgabe, siehe unten).
2. Neue Fact-Objekte anhängen, `id` fortlaufend ab der höchsten + 1, z.B.:
   ```json
   { "id": 181, "category": "history", "lang": "de", "text": "...", "source": null, "tags": ["dinosaurs", "fossils"] }
   ```
   Kategorien frei aus der bestehenden Liste wiederverwenden (science, history, nature, space, animals, geography, technology, psychology, food, curiosities), `lang` ist `"de"` oder `"en"`.

   **Tags** (Pflicht, 1–3 pro Fact): feingranulare Unterthemen, auf denen der Algorithmus zusätzlich zur Kategorie lernt. Konvention: englisch, lowercase, Bindestriche statt Leerzeichen (`ancient-rome`), Plural bei zählbaren Nomen (`dinosaurs`), spezifischster Tag zuerst, Kategorie nicht als Tag wiederholen. **Vorhandene Tags wiederverwenden statt Synonyme zu erfinden** — die aktuelle Tag-Liste zeigt `node validate-facts.js`. Tags dürfen quer über Kategorien genutzt werden (z.B. `dinosaurs` auf History- und Nature-Facts).
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

Läuft über GitHub Pages auf `main`/Root: https://antonpawlik-lgtm.github.io/fact-feed/. Auf dem iPhone über Safari "Zum Home-Bildschirm hinzufügen" für ein App-artiges Icon.

## Lizenz

Alle Rechte vorbehalten, siehe [LICENSE](LICENSE). Der Code ist öffentlich einsehbar, aber nicht zur Nutzung freigegeben.
