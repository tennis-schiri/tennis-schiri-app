# TENNILO – Doppelturnier mit festen Zweierteams (v0.7.0)

**Stand:** 2026-11-06  
**Status:** Doppelturnier und schreibgeschützte Fernanzeige wurden am 05.11.2026 als v0.8.0 erfolgreich auf die passwortgeschützte Testseite veröffentlicht ([GitHub-Run 42085118679](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42085118679), 200 Tests bestanden). Noch kein unabhängiger Zweitgeräte-Praxistest bestätigt. **Neue Zeitplanung v0.8.2 nur GitHub**, kein erneuter Upload. Backend und gemeinsame Cloud-Bearbeitung bleiben zurückgestellt.

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

### Zeitplanung und Machbarkeit v0.8.2 (nur GitHub)

- Weiterhin 1–8 Spiele je Team und ein **mathematischer Gegner-/Paritätscheck**: Teams müssen mindestens die gewünschte Gegnerzahl haben, kein Gegner wiederholt sich; bei ungerader Anzahl Teams sind **fünf** Spiele pro Team nicht möglich (vier oder sechs können möglich sein).
- Neue **Machbarkeitsanzeige** im Bereich Einstellungen und Spielplan: jede Option 1–8 wird durch eine echte Probeauslosung geprüft. Diese liefert tatsächliche Begegnungen und die benötigten Zeitblöcke für die aktuelle Zahl verfügbarer Plätze.
- **Endzeit ist optional.** Im festen Modus bleiben Spieldauer und Wechselzeit unverändert und Überschreitungen werden gemeldet. Mit der ausdrücklich gewählten Option „Spielzeiten bis zur Endzeit anpassen“ wird die vorhandene Zeit auf die benötigten Blöcke inklusive Wechselpausen aufgeteilt. Wenn weniger als 10 Spielminuten pro Block verbleiben, wird nicht ausgelost bzw. wird die Planung zurückgewiesen.
- **Top-8-Play-offs** sind bei mindestens acht Teams für die Zeitplanung standardmäßig reserviert (separat abschaltbar). Viertelfinale, Halbfinale sowie Finale/Platz 3 werden entsprechend der Platzanzahl in weitere Spielblöcke verteilt. Die entsprechenden geplanten Zeitfenster sind in der Play-off-Ansicht einsehbar.
- Die bereits gestarteten Rundenuhren behalten ihre ursprünglich gespeicherten Minuten. Das Enddatum kann bei Uhrzeiten nach Mitternacht am Folgetag liegen. Die Endzeit ist ein realistischer **Plan**, kein Versprechen, dass laufende Spiele tatsächlich punktgenau enden.
- Geändert: `site/assets/operations.js`, `doubles.js`, `doppel-ui.js`, `storage.js`; neue Tests `tests/scheduling.test.mjs` und `tests/scheduling-ui.test.mjs`. Vollständiger GitHub-/Browser-Test und FTPS-Upload von v0.8.2 stehen noch aus.

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

Alte Schleifchenturniere werden beim Einlesen ohne `type` weiterhin als `ribbon` normalisiert. Neue Doppelturniere haben `type: "doubles"` und `doubles: {teams,draw,playoffs,playoffOptOut}`. Gemeinsame JSON-Sicherungen enthalten beide Turnierarten, getrennte Ergebnisdaten werden nicht vermischt. Der Doppelmodus bietet jetzt neben dem JSON-Download auch einen direkten **Import** der Sicherung mit einer ausdrücklichen Warnung, dass die bisherigen Browser-Turniere ersetzt werden (maximal 3 MB).

## Auslosung und Einschränkungen

- Bei gerader Anzahl anwesender Teams werden die ersten gewünschten Paarungsrunden eines vollständigen Round-Robin-Verfahrens verwendet. Bei ungerader Teamzahl werden ausgewogene zyklische Paarungen für eine gerade Begegnungszahl pro Team erzeugt. Alle Begegnungen werden anschließend anhand der vorhandenen Plätze in konfliktfreie Zeitblöcke eingeteilt.
- Ohne mindestens `Spiele je Team + 1` anwesende Teams gibt es nicht genügend unterschiedliche Gegner. Bei ungerader Teamzahl ist zudem eine ungerade Anzahl Spiele je Team unmöglich, wenn *alle* genau gleich oft antreten sollen. Die App zeigt diese fachliche Grenze, statt fehlerhaft auszulosen.
- Die Teamliste und Anwesenheit sind nach der Auslosung gesperrt, damit kein Spielplan unbemerkt ungültig wird. Barzahlungen bleiben veränderbar. Vor Neuauslosung wird gewarnt, dass Ergebnisse und Play-offs verloren gehen.
- Play-offs beginnen erst nach allen regulären Ergebnissen. Sie sind für mindestens acht anwesende und zugelassene Teams gedacht. Bei weniger Teams wird die Endrunde noch nicht bereitgestellt.
- Maximal 100 Teams, bis zu 8 Spiele je Team und technisch 1000 Plätze; nicht für einen großen Realbetrieb ohne Performance- und Praxistests freigegeben.
- Die Benutzeroberfläche übernimmt **keine** Onlinezahlung, keine Spielerkonten und keine zentrale Datenbank. Die vorhandene geschützte Zuschauer-Fernanzeige wurde für den Doppelmodus erweitert: Paarungen, Ergebnisse, Rundenuhr und Siege/Game-Differenz der Teamrangliste. Die Turnierleitung muss den Servermodus explizit aktivieren und kann den Zuschauer-Link widerrufen. **Kein öffentlich freier Zugang**, solange der ALL-INKL-HTTP-Passwortschutz besteht.

## Tests und Veröffentlichung

Die 18 Logiktestfälle in `tests/doubles.test.mjs` wurden am 2026-11-05 zusätzlich isoliert im JavaScript-Ausführungsmodell durchlaufen; sie bestanden nach Korrektur eines falsch notierten Test-Ergebnisses. Die JavaScript-Module wurden syntaktisch geprüft. **Neue Live-/Fernanzeige-Regressionen** liegen in `tests/doubles-live.test.mjs`, `tests/doubles-remote-publisher-ui.test.mjs` und der erweiterten PHP-Integration `tests/live-feed.test.mjs`. **Ein vollständiger GitHub-Actions-Lauf, manuelle Browsertests und echte Tests bei ALL-INKL sind separat zu bestätigen.** Das Hinzufügen von `site/doppel.html`, `doppel.css`, `doppel-ui.js` und `doubles.js` zur expliziten FTPS-Allowlist bewirkt **keinen automatischen Upload**.

Bevor v0.7.0 online geht: GitHub-CI für alte Schleifchen- und neue Doppel-/Live-Tests prüfen; Demo auf PC und Mobilgerät durcharbeiten; 6/7/8 Teams und variierende Plätze ausprobieren; JSON-Export/Import, Barzahlungen, Ergebnisänderung, Play-off-Nachrücker, Countdown und Moduswechsel manuell prüfen. Erst nach ausdrücklicher Freigabe den manuellen FTPS-Workflow starten.

**Nächste Turnierart nach dem Doppelturnier:** One Point Cup.

## Neu: Gemeinsamer Live-Monitor für Doppelturniere

Die bestehende `site/live.html` zeigt bei `type: doubles` nach dem Auslosen Teamnamen, Platz, Game-Ergebnisse, Sieger, Zeitplan und laufende Rundenuhr. Die Rangliste heißt **Doppel-Livetabelle** und zeigt Siege und Game-Differenz, statt Schleifchenzahlen. Nach Erstellung der Play-offs erscheinen die aktuelle Endrunde und später das Siegerdoppel. Über die Doppelturnierleitung stehen „Monitor öffnen“, „Fernanzeige aktivieren“, „Zuschauer-Link kopieren“, „Freigabe beenden“, „Diese Runde auf Monitor zeigen“ und „Play-offs auf Monitor zeigen“ bereit.

Der vorhandene `live-feed.php`-Dienst wurde um einen erlaubten Wert `format: doubles`, die Ranglistenfelder `wins`, `gameDiff`, `gamesFor` und Rundennummern bis 499 erweitert. Er filtert unabhängig vom Browser sämtliche privaten Kassen-, Anwesenheits- und Teamverwaltungsfelder aus dem Snapshot. Der zufällige Schreibschlüssel wird nicht in den Zuschauerdaten oder im JSON-Turnierbackup gespeichert. **Die Fernanzeige wurde mit v0.8.0 hochgeladen; ein echter zweiter Monitor im Praxisbetrieb muss noch bestätigt werden.**
