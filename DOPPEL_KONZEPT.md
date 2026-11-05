# TENNILO – Doppelturnier mit festen Zweierteams (v0.7.0)

**Stand:** 2026-11-05  
**Status:** Im privaten GitHub-Code implementierte lokale Testversion, **nicht veröffentlicht**. Die produktive App auf `app.tennis-schiri.de` bleibt bis zur ausdrücklich ausgelösten FTPS-Veröffentlichung bei v0.6.1. Keine Benutzerregistrierung, keine gemeinsame Cloud-Bearbeitung und noch keine separate externe Doppel-Fernanzeige.

## Fachliche Quelle

Die eigene Google-Tabelle [„Turniere Verein – Auslosung & Livetabelle“](https://docs.google.com/spreadsheets/d/1aNwzYXmHhpONZURtufkDg6qZHX1-ywOYgyRd_u_LHCY/edit), insbesondere die Tabs `Doppel-Setup`, `Doppel-Teams`, `Doppel-Auslosung`, `Doppel-Livetabelle`, `Doppel-Play-Offs` und `Doppel-Runden & Zeit`. Die Ursprungsdatei bleibt unverändert.

### Übernommene Fachregeln

- Zwei dauerhaft zu einem Team gehörende Spieler, nicht automatisch wechselnde Schleifchen-Partner.
- Für die Vorrunde standardmäßig vier Begegnungen je anwesendem Team; individuell 1–8 wählbar, solange eine wiederholungsfreie Paarung überhaupt möglich ist.
- Kein Gegnerpaar zweimal. Ein Team steht pro Zeitblock höchstens auf einem Platz; mehrere Plätze können parallel bespielt werden. Bei wenig Plätzen werden zusätzliche Zeitblöcke erzeugt.
- Ein Satz / No-Ad als Turniervorgabe; Ergebnis wird über Games und explizite Siegerauswahl erfasst. Bei identischen Games müssen Entscheidungspunkte erfasst werden, die den Sieger eindeutig bestimmen.
- Rangliste: gewonnene Spiele (Siege) absteigend, danach Game-Differenz, dann gewonnene Games. Bei vollkommenem Gleichstand vorläufig alphabetische Sortierung; keine automatischen weiteren Tie-Break-Spiele.
- Play-offs für acht zugelassene Teams, gesetzt nach Livetabelle: Rang 1–8, 4–5, 2–7, 3–6. Danach Halbfinale, Finale und Platz 3. Ausgeschlossene Teams können durch nachfolgende Teams ersetzt werden.
- Änderungen früherer Play-off-Sieger, die die Paarungen ändern, setzen die davon abhängigen Endrundenergebnisse zurück.
- Teilnahme/Check-in pro Team. Bar-Nenngeld wird je *Spieler* mit Normal- und Ermäßigt-Kategorie sowie tatsächlich gezahltem Betrag dokumentiert. Die Softwarelizenzzahlung ist getrennt.
- Einstellbare Spielzeit, Pause, frei wählbare Anzahl und Namen von Plätzen; Start-/Endzeiten je tatsächlichem Spielblock. Start/Pause/Fortsetzen/Beenden/Zurücksetzen der Uhr.

### Technische Umsetzung

| Modul | Funktion |
| --- | --- |
| `site/doppel.html` | Separate Browseroberfläche unter derselben App |
| `site/assets/doppel-ui.js`, `doppel.css` | Teameingabe, Bar-Kasse, Spielplan, Resultate, Tabelle, Play-offs, Uhr |
| `site/assets/doubles.js` | Fachlogik: regulärer Paarungsgraph, gerichtete Ergebnisse, Rangliste, Top-8-Progression |
| `site/assets/storage.js` | Typunterscheidung `ribbon` / `doubles`; vorhandenes Backup-Schema und lokaler Store; eigenständige Teamdaten und Spielstände |
| `site/assets/app.js` | Startseite zeigt beide Turnierarten; beim Öffnen des Doppelturniers wird die entsprechende Oberfläche verwendet |
| `tests/doubles.test.mjs` | Auslosung, Ergebnislogik, Rangliste, Endrundenschutz, Zeitplanung |
| `tests/doubles-ui.test.mjs` | Verfügbarkeit der Oberflächen, Routing, Sicherheit und explizite FTPS-Allowlist |

Alte Schleifchenturniere werden beim Einlesen ohne `type` weiterhin als `ribbon` normalisiert. Neue Doppelturniere haben `type: "doubles"` und `doubles: {teams,draw,playoffs,playoffOptOut}`. Gemeinsame JSON-Sicherungen enthalten beide Turnierarten, getrennte Ergebnisdaten werden nicht vermischt.

## Auslosung und Einschränkungen

- Bei gerader Anzahl anwesender Teams werden die ersten gewünschten Paarungsrunden eines vollständigen Round-Robin-Verfahrens verwendet. Bei ungerader Teamzahl werden ausgewogene zyklische Paarungen für eine gerade Begegnungszahl pro Team erzeugt. Alle Begegnungen werden anschließend anhand der vorhandenen Plätze in konfliktfreie Zeitblöcke eingeteilt.
- Ohne mindestens `Spiele je Team + 1` anwesende Teams gibt es nicht genügend unterschiedliche Gegner. Bei ungerader Teamzahl ist zudem eine ungerade Anzahl Spiele je Team unmöglich, wenn *alle* genau gleich oft antreten sollen. Die App zeigt diese fachliche Grenze, statt fehlerhaft auszulosen.
- Die Teamliste und Anwesenheit sind nach der Auslosung gesperrt, damit kein Spielplan unbemerkt ungültig wird. Barzahlungen bleiben veränderbar. Vor Neuauslosung wird gewarnt, dass Ergebnisse und Play-offs verloren gehen.
- Play-offs beginnen erst nach allen regulären Ergebnissen. Sie sind für mindestens acht anwesende und zugelassene Teams gedacht. Bei weniger Teams wird die Endrunde noch nicht bereitgestellt.
- Maximal 100 Teams, bis zu 8 Spiele je Team und technisch 1000 Plätze; nicht für einen großen Realbetrieb ohne Performance- und Praxistests freigegeben.
- Die Benutzeroberfläche übernimmt **keine** Onlinezahlung, keine Spielerkonten, keine zentrale Datenbank und keine öffentliche Zuschauer-Fernanzeige. Die bestehende Fernanzeige v0.6.1 zeigt aktuell ausschließlich Schleifchen-Resultate. Eine eigene Doppel-Live-Anbindung kann später folgen.

## Tests und Veröffentlichung

Die 18 Logiktestfälle in `tests/doubles.test.mjs` wurden am 2026-11-05 zusätzlich isoliert im JavaScript-Ausführungsmodell durchlaufen; sie bestanden nach Korrektur eines falsch notierten Test-Ergebnisses. Die JavaScript-Module wurden syntaktisch geprüft. **Ein vollständiger GitHub-Actions-Lauf, manuelle Browsertests und echte Tests bei ALL-INKL sind separat zu bestätigen.** Das Hinzufügen von `site/doppel.html`, `doppel.css`, `doppel-ui.js` und `doubles.js` zur expliziten FTPS-Allowlist bewirkt **keinen automatischen Upload**.

Bevor v0.7.0 online geht: GitHub-CI für alte Schleifchen- und neue Doppel-Tests prüfen; Demo auf PC und Mobilgerät durcharbeiten; 6/7/8 Teams und variierende Plätze ausprobieren; JSON-Export/Import, Barzahlungen, Ergebnisänderung, Play-off-Nachrücker, Countdown und Moduswechsel manuell prüfen. Erst nach ausdrücklicher Freigabe den manuellen FTPS-Workflow starten.

**Nächste Turnierart nach dem Doppelturnier:** One Point Cup.
