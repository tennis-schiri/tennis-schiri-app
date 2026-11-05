# TENNILO – Projektstatus

**Stand:** 2026-11-05  
**Produktname:** TENNILO (Arbeitstitel; Marke/Domain nicht abschließend geprüft)  
**Dachmarke:** Tennis-Schiri / Insta Tennis-Schiri  
**Repository:** `tennis-schiri/tennis-schiri-app` (privat, Branch `main`)  
**Version im GitHub-Code:** **0.3.0**  
**FTPS-Upload zuletzt bestätigt:** v0.3.0 – manueller [GitHub-Actions-Lauf 41986086093](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/41986086093) vom 2026-11-05 erfolgreich (Commit `3225a52129e0c97403d2246f309140880c210439`). Tests und Transfer aller fünf App-Dateien waren grün. **Browser-Funktionstest der v0.3.0 nach diesem Upload steht noch aus.**

> **Wichtig beim Wiedereinstieg:** Erst diesen Status und `ENTSCHEIDUNGEN.md` lesen, dann den tatsächlichen GitHub-Code prüfen. „In GitHub umgesetzt“ ist nicht gleich „online veröffentlicht“ oder „im echten Browser vollständig getestet“.

## Produktidee

Browserbasierter Turniermanager für Tennisvereine und Veranstalter. Zunächst Schleifchenturnier, später Doppelturnier und One Point Cup. Ziel: Turnier anlegen, Teilnehmer erfassen, Auslosung erstellen, Ergebnisse eingeben und Tabellen live darstellen. Die App soll auf Smartphone, Tablet und Computer nutzbar sein.

**Claim:** „Weniger Orga. Mehr Tennis.“  
**Aktuelle URL:** https://app.tennis-schiri.de/index.html  
**Arbeitsname:** TENNILO; UI und Repository tragen derzeit noch überwiegend „Tennis-Schiri/Turniermanager“. Eine komplette Umbenennung wurde **nicht** beauftragt.

## Bereits implementiert (GitHub `main`)

- [x] Responsive Startseite im petrol-/orange-/limettengrünen Design
- [x] Mehrere Schleifchenturniere anlegen, bearbeiten, auswählen und löschen
- [x] Von einem Turnier zur Startseite zurückkehren und vorhandene Turniere wieder öffnen
- [x] Turniereinstellungen: Name, Datum, Startzeit, Spieldauer, Wechselzeit, Wertungsspiele pro Person
- [x] Anzahl der Plätze frei als Zahl erfassen (technische Grenze: 1–1000; keine feste Grenze bei 7)
- [x] Fortlaufende Platzkennungen, Standardnamen „Platz 1“, „Platz 2“ usw.
- [x] Individuelle Platznamen unter **Einstellungen → Platzbezeichnungen → Plätze benennen**
- [x] Teilnehmende hinzufügen, bearbeiten, löschen und suchen
- [x] Gruppen „Stark“/„Schwächer“ und Anwesenheit je Spieler verwalten
- [x] Dashboard mit Teilnehmerzahlen, Platzanzahl und vorbereitenden Hinweisen
- [x] JSON-Sicherung herunterladen und wieder einlesen
- [x] Lokale Browser-Speicherung (`localStorage`) als vorläufige Datenhaltung
- [x] Manuell auslösbarer FTPS-Deploy-Workflow in GitHub Actions; fünf App-Dateien
- [x] Auslosungsbereich mit normalen Vorrunden (3 oder 4 Wertungsspiele je Spieler)
- [x] Doppelteam immer 1 Stark + 1 Schwächer; Platz-/Rundenprüfung und Spielplan-Speicherung
- [x] Nötige Auffüllrunde erkennen, ohne die Auswahl der Auffüller vor den Ergebnissen zu treffen
- [x] Automatisierte Auslosungstests unter `tests/draw.test.mjs` vor jedem manuellen FTPS-Upload

**Prüfstand:** Simulierte Prüfungen von Auslosungsfällen, Gruppen/Plätzen, Navigation und Browser-Speicherung wurden ausgeführt. Es gibt neue wiederholbare Node-Tests, die beim nächsten manuellen GitHub-Workflow laufen. Der GitHub-Actions-Lauf `41986086093` bestätigte die Auslosungstests und den FTPS-Upload erfolgreich. Es gibt bislang keine vollständige Browser-End-to-End-Testsuite und keine Freigabe für reale Turniere.

## Nicht implementiert

- [ ] Vollständige Auslosung inklusive Auffüllrunde (reguläre Runden sind im Code umgesetzt)
- [ ] Erfassung der Ergebnisse, Berechnung von Wertungen und Livetabellen
- [ ] Feste Doppel-Teams und One Point Cup
- [ ] Server-Datenbank, Benutzerkonten, Rollen/Rechte, Mehrgeräte-Synchronisierung
- [ ] Mehrbenutzerbetrieb, Backups auf Serverebene, Datenschutz- und Sicherheitsfreigabe
- [ ] Automatisierte Browser-/Integrationstests
- [ ] Produktname TENNILO in der App konsistent umgesetzt; Markenprüfung abgeschlossen

## Technik und Veröffentlichung

| Thema | Aktueller Stand |
| --- | --- |
| Hosting | ALL-INKL, Tarif Privat mit SSL-Erweiterung; PHP/MySQL verfügbar |
| Subdomain | `app.tennis-schiri.de`, eigenes Webspace-Verzeichnis |
| Zugang | HTTPS und zusätzlicher ALL-INKL-Verzeichnisschutz (HTTP Basic Auth) |
| Repository | `tennis-schiri/tennis-schiri-app` (privat) |
| Frontend | HTML, CSS, JavaScript-Module; derzeit kein React-Build und kein Node-Server |
| Speicherung | Im jeweiligen Browser mit `localStorage`, Schema-Version 1 |
| Deployment | `.github/workflows/deploy.yml` – manuell `workflow_dispatch` starten |
| Für v0.3.0 vorgesehene Upload-Dateien | `site/index.html`, `site/assets/styles.css`, `site/assets/storage.js`, `site/assets/draw.js`, `site/assets/app.js` |
| Zugangsdaten | Nur als GitHub-Actions-Secrets `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`; **keine Werte dokumentieren** |

**Workflow-Wartung 2026-11-05:** `actions/checkout@v7`, `actions/setup-node@v7`, `ubuntu-24.04` (statt `ubuntu-latest`) und Checkout ohne persistierte Git-Zugangsdaten. Diese Änderung ist im GitHub-Code gespeichert; der erste Lauf mit den neuen Action-Versionen ist noch nicht bestätigt. Der Upload bleibt manuell.\n\n**Wichtig:** Der Workflow lädt ausschließlich die fünf expliziten App-Dateien hoch, ersetzt nicht `.htaccess` und löscht keine anderen Dateien. Die ursprüngliche ALL-INKL-`index.htm` kann noch bestehen; die App deshalb zunächst explizit mit `/index.html` öffnen. Passwortschutz nicht entfernen. Die Hauptwebsite `tennis-schiri.de` bleibt davon getrennt.

## Nächster sinnvoller Entwicklungsschritt

1. **v0.3.0 nach erfolgreichem Upload im Browser prüfen:** Neue Auslosung, individuelle Platznamen, Teilnehmer, Sicherung/Import, Rücknavigation und Speicherung; den GitHub-Testlauf kontrollieren.
2. **Ergebnisse und Schleifchenwertung:** Ergebnisse der regulären Runden erfassen und Gewinner/Schleifchen korrekt berechnen (vgl. Apps Script).
3. **Sonderrunde:** Erst nach vollständigen Ergebnissen der regulären Runden Auffüller mit 0 oder 1 Schleifchen auswählen. Das Zusatzspiel ist für Auffüller nicht wertungsrelevant.
4. **Danach:** Tabelle, Endrunde und serverseitige Persistenz mit Benutzerrollen.

### Google Drive und fachliche Quellen

Im übergeordneten [Drive-Projektordner](https://drive.google.com/drive/folders/1wasNarP_HEA4o0zqGLlBumfzObEytnjl) gibt es die bestehende Bibliothek [„Turnierformate“](https://drive.google.com/drive/folders/1aPuhuzKZvif5RnfXXVcJsGCkRL6wepfs). Ergänzend wurde ein eigener Ordner [„TENNILO – Dokumentation“](https://drive.google.com/drive/folders/1w6WBQH0o5MEwnKn3ZuuN43HiHaxvMnBg) mit einem [Projektwegweiser](https://docs.google.com/document/d/1d9Gx6AahC1RbEVFtavmo4Y8UAU7_R6EzmmiWQ5mlZr8/edit) eingerichtet.

Thematische Links zu den vorhandenen PDF- und Excel-Turnierformaten stehen in [QUELLEN_TURNIERFORMATE.md](QUELLEN_TURNIERFORMATE.md). **GitHub bleibt die führende Quelle für technische Versionsstände und Entscheidungen; die Original-Vorlagen in Drive werden nicht verändert.**

### Quelle für Turnierregeln

Bestehende Google-Tabelle: [„Turniere Verein – Auslosung & Livetabelle“](https://docs.google.com/spreadsheets/d/1aNwzYXmHhpONZURtufkDg6qZHX1-ywOYgyRd_u_LHCY/edit). Enthält Schleifchenturnier, Doppelturnier und One Point Cup sowie Apps Script. **Nicht** annehmen, dass die Tabellenlogik bereits auf die Web-App übertragen wurde.

### Für neue Chats

> Wir arbeiten an **TENNILO** (Arbeitstitel), der Tennis-Turnier-App von Tennis-Schiri. Bitte öffne im privaten GitHub-Repository `tennis-schiri/tennis-schiri-app` zuerst `PROJEKTSTATUS.md`, `ENTSCHEIDUNGEN.md` und `CHANGELOG.md`, prüfe den aktuellen Code und setze beim nächsten offenen Schritt fort. Veröffentlichung ausschließlich nach ausdrücklicher Freigabe; GitHub-Implementierung nicht mit Live-Deployment gleichsetzen.

### Aktualisierungsregel

Nach jedem größeren Entwicklungsschritt **diese Datei** aktualisieren: Versionsstand im Code, tatsächlich bestätigter Live-Stand, fertig vs. offen, Testergebnisse, konkrete nächste Aufgabe. Entscheidungen und Versionsänderungen zusätzlich in `ENTSCHEIDUNGEN.md` und `CHANGELOG.md` eintragen.
