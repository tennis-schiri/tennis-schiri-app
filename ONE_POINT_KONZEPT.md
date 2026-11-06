# TENNILO – One Point Cup (v0.8.0 veröffentlicht, v0.8.2-Zeitplanung in GitHub)

**Stand:** 2026-11-06. **Live:** v0.8.0 mit One Point Cup wurde am 05.11.2026 über den [erfolgreichen GitHub-Upload 42085118679](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42085118679) veröffentlicht (27 Dateien, 200 Tests). **Nur GitHub:** v0.8.2 bringt Zeitplanung bis zur Endzeit. Die private B0.2-Konto-API bleibt deaktiviert.

## Fachliche Vorlage

[„Turniere Verein – Auslosung & Livetabelle“](https://docs.google.com/spreadsheets/d/1aNwzYXmHhpONZURtufkDg6qZHX1-ywOYgyRd_u_LHCY/edit), Tabellen **OPC-Spieler** (maximal 64 Spieler, Standardfeld 32, Check-in und Übernahme aus anderen Turnieren) und **One Point Cup** (einmalig ausgelostes K.-o.-Tableau, Sieger-Auswahl pro Begegnung bis zum Finale). Die Google-Tabelle wurde nicht verändert.

## Umgesetzt

- Eigene `site/opc.html`-Oberfläche, erreichbar über die TENNILO-Startseite und über gespeicherte One Point Cups.
- Ein *einziger entscheidender Punkt* je direkter Begegnung, kein Satz-/Game-Ergebnis.
- Feldgröße 2, 4, 8, 16, **32 (Standard)** oder 64. Maximal 64 Spieler. Teilnehmernamen, Anwesenheit und individuelles Bar-Nenngeld; Standard- und Jugendgebühr.
- Auslosung mit reproduzierbarem Zufallsstartwert. Fair verteilte Erstrunden-Freilose bei nicht voller Feldgröße. Die gewählte Feldgröße muss zur anwesenden Spielerzahl passen: mindestens ein tatsächlich ausgetragenes Duell in Runde 1.
- Automatisches Fortschreiben der Sieger durch K.-o.-Runden bis zum Cup-Sieger. Bei Ergebnisänderung werden nur dadurch ungültig gewordene Folgeergebnisse zurückgesetzt. Noch nicht ermittelte Gegner werden **nicht** als Freilos interpretiert.
- K.-o.-Runden als klickbare Phasen. Manuelle Siegerentscheidung, Änderung oder Rücknahme mit Schutzabfrage.
- Spielername und Anwesenheit nach Auslosung gesperrt; Nenngelder weiterhin korrigierbar. Vor Zurücknahme des Tableaus inklusive Ergebnisse erscheint eine Warnung.
- Spielerübernahme aus gespeicherten Schleifchen- oder Doppelturnieren: Nur anwesende Personen, keine doppelten Namen, bis zu 64 Einträge. **Barzahlungen werden ausdrücklich nicht übernommen**, damit sie nicht mehrfach gebucht werden.
- JSON-Export und direkter JSON-Import für alle drei Turnierarten gemeinsam; Import ersetzt nach ausdrücklicher Warnung die bisherigen Browser-Turniere (maximal 3 MB).
- Mobile Darstellung in TENNILO-Farben, Browser-Speicher wie bei den bisherigen Turnierarten.

## Dateien

| Datei | Zweck |
| --- | --- |
| `site/opc.html` | Neue Oberfläche |
| `site/assets/one-point.css` | Responsive K.-o.-Darstellung |
| `site/assets/one-point-ui.js` | Spieler, Kasse, Auslosung, Runden und Ergebniseingabe |
| `site/assets/one-point.js` | K.-o.-Logik, Freilose, Siegereinzug und Prüfsignatur |
| `site/assets/storage.js` | Turniertyp `opc` und eigenes Datenmodell `opc: {players, fieldSize, draw}` |
| `site/assets/app.js` | Dritte Turnierart auf Hauptseite |
| `tests/one-point.test.mjs` | Fachtests, Korrekturen, Freilose, JSON |
| `tests/one-point-ui.test.mjs` | Oberflächen- und Routingtests, simulierte Demobedienung |

Die bisherigen Turnierarten `ribbon` (Schleifchen) und `doubles` (feste Doppel) behalten ihre eigenen Teilnehmer- und Ergebnisdaten. Das JSON-Backup bleibt Schema-Version 1.

## Wichtige Abgrenzungen

- Die Originalvorlage hat ein standardmäßiges 32er-Feld. TENNILO erlaubt kleinere und größere Zweierpotenz-Felder. Ein Cup mit weniger als der Hälfte der Feldplätze muss die Feldgröße reduzieren; so gibt es keine komplett aus Freilosen bestehende Erstrunde.
- In v0.8.2 (noch nicht online) schätzt die App Zeitblöcke für einzelne Ein-Punkt-Matches, wählbar 1–15 Minuten pro Slot und mit parallelen Tennisplätzen. Keine einzelnen echten Match-Stoppuhren und noch keine automatische Platzzuweisung; K.-o.-Stufen laufen planmäßig nacheinander.
- **Die Live-/Fernanzeige ist bislang nur für Schleifchen und feste Doppel freigegeben.** One Point Cup besitzt noch keine Zuschaueransicht.
- Anmeldung, Vereine/Backend, serverseitige gemeinsame Turnierbearbeitung und Onlinezahlungen bleiben zurückgestellt. Bar-Nenngeld dient ausschließlich als manuelles Kassenprotokoll.
- Tests: 16 One-Point-Fachtests und ein simulierter UI-Ablauf wurden isoliert erfolgreich durchgespielt. Die JavaScript-Syntax ist geprüft. **Vollständige GitHub-CI, PHP-/ALL-INKL- und echte Browser-/Mobilgerätetests sind noch separat zu bestätigen.**
- Die vier OPC-Dateien wurden mit der v0.8.0 erfolgreich per FTPS veröffentlicht. Die neuen Zeitplanungsänderungen v0.8.2 wurden **nicht** hochgeladen.

## Optionale Endzeitplanung v0.8.2 – nur GitHub

- Turnierleitung gibt weiterhin eine Startzeit und optional eine Endzeit an. Es gibt einen festen Zeitmodus und die Wahl **„Zeitblöcke an Endzeit anpassen“**.
- Im Settings-Formular wird die Zahl der gleichzeitig nutzbaren Tennisplätze (1–64) und die geplante Dauer pro Ein-Punkt-Begegnung einschließlich Wechsel (1–15 Minuten) erfasst.
- Für jedes K.-o.-Level werden die tatsächlichen Duelle ohne Freilose gezählt und mit `ceil(Duelle/Plätze)` Zeitblöcke kalkuliert. Alle Levels laufen nacheinander; Matches innerhalb eines Levels können parallel stattfinden. Nur der Zeitbedarf des gesamten Cups wird angezeigt, keine individuelle Spielzeit pro Spieler.
- Die Endzeitautomatik verteilt die Minuten auf die nötigen Slots, sofern mindestens eine Minute pro Slot vorhanden ist. Anderenfalls zeigt die App einen Fehler statt die Endzeit trotz unzureichender Kapazität zu versprechen.
- Die vorhandenen JSON-Daten bleiben kompatibel; `endTime`, `timeMode`, `opcMinutes` und `courts` werden im selben Turnierdatensatz gespeichert.
- Fachtests in `tests/scheduling.test.mjs`; v0.8.2 wurde noch **nicht** per FTPS veröffentlicht, die volle CI/Browserprüfung steht aus.

## Als Nächstes

1. Alle GitHub-Tests einschließlich Schleifchen und Doppel automatisiert ausführen und Fehlschläge beheben.
2. One Point Cup mit 8, 16, 20/32 und 33/64 Spielern im Browser prüfen, inklusive Freilos, Ergebnisänderung, Kassenkorrektur, Wiederherstellung und Wechsel zwischen den drei Turnierarten.
3. Gemeinsame Live-Anzeige auch für den One Point Cup entwickeln und prüfen, bevor ein gemeinsamer Release freigegeben wird.
