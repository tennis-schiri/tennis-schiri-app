# TENNILO – Projektstatus

**Stand:** 2026-11-05  
**Neuer unveröffentlichter Baustein:** B0.2 Konto-/Vereinsoberfläche im separaten `backend/staging-ui/` (kein FTPS-Upload, keine LIVE-Konten).  
**Produktname:** TENNILO (Arbeitstitel; Marke/Domain nicht abschließend geprüft)  
**Dachmarke:** Tennis-Schiri / Insta Tennis-Schiri  
**Repository:** `tennis-schiri/tennis-schiri-app` (privat, Branch `main`)  
**Version im GitHub-Code:** **0.6.1**  
**FTPS-Upload zuletzt bestätigt:** **v0.6.1** – [GitHub Actions Run 42044203175](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42044203175) vom **2026-11-05** erfolgreich; alle App- und Live-Dateien im manuellen FTPS-Job hochgeladen. **Ein unabhängiger Smart-TV-/Zweitgeräte-Funktionstest auf ALL-INKL ist noch nicht bestätigt.** Das neue Backend B0.1/B0.2 wird **nicht** über FTPS veröffentlicht.

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
- [x] Manuell auslösbarer FTPS-Deploy-Workflow in GitHub Actions; ab v0.6.1 nur 19 freigegebene Dateien inklusive PHP-Live-Endpunkt. PHP-Syntax und alle Tests vor Upload; zusätzlich separater automatischer CI-Prüfworkflow **ohne Upload**
- [x] Auslosungsbereich mit normalen Vorrunden (3 oder 4 Wertungsspiele je Spieler)
- [x] Doppelteam immer 1 Stark + 1 Schwächer; Platz-/Rundenprüfung und Spielplan-Speicherung
- [x] Nötige Auffüllrunde erkennen und erst nach vollständigen regulären Ergebnissen mit 0-/1-Schleifchen-Kandidaten auslosen
- [x] Automatisierte Auslosungstests unter `tests/draw.test.mjs` vor jedem manuellen FTPS-Upload
- [x] Ergebnisfelder je Begegnung (Games optional, Siegerteam ausdrücklich auswählen); Ergebnisänderung und Rücksetzung
- [x] Schleifchen-Zwischenstand für alle anwesenden Spieler (Siege, Niederlagen, Spiele, Quote) nach der Logik der bestehenden Tabelle
- [x] Vorprüfung von Auffüllkandidaten (0 oder 1 Schleifchen) nach Abschluss aller regulären Ergebnisse
- [x] Ergebnisse bleiben im jeweiligen Browser gespeichert und in JSON-Sicherungen erhalten
- [x] **v0.3.2:** Nach dem Speichern wird der Ergebniseditor durch den Spielstand zwischen den Teams ersetzt; Gewinnerseite deutlich markiert; „Ergebnis ändern“ und „Abbrechen“ erlauben Korrekturen ohne Datenverlust
- [x] UI-Regressionstest `tests/result-ui.test.mjs` für Speichern, Einklappen, Gewinnerhervorhebung, Bearbeiten, Abbrechen und erneutes Öffnen
- [x] `tests/results.test.mjs` mit elf Ergebnis- und Wertungstests
- [x] **v0.3.3:** Separate Auffüllrunde nach allen normalen Ergebnissen automatisch auslosen, geeignete 0/1-Schleifchen-Spieler auswählen und markieren
- [x] Auffüllrunde mit eigener Ergebniserfassung; Zusatzspiel zählt ausschließlich für regulär eingeplante Spieler
- [x] Auffüllrunde mit Sicherheitsabfrage zurücknehmen; reguläre Ergebnisse bleiben erhalten, danach lassen sie sich wieder bearbeiten
- [x] Neuer Startseiten-Button „Auffüllrunde testen“ für 5 starke + 5 schwächere Demo-Teilnehmer (3 Wertungsspiele)
- [x] 12 Tests in `tests/special.test.mjs`, zusätzlicher UI-Test `tests/special-ui.test.mjs`
- [x] **v0.4.0:** Endrunden-Tab; Qualifikation der besten 8 oder 16 nach Schleifchen, Spielzahl und Name; einzelne Spieler abwählen und Nachrücker berücksichtigen
- [x] Einmalige Auslosung fester Doppelpartner: möglichst Stark + Schwächer, übrige Spieler innerhalb der eigenen Stärkegruppe
- [x] K.-o.-Endrunde: 8 Personen → 2 Halbfinale und Finale; 16 Personen → 4 Viertelfinale, 2 Halbfinale und Finale
- [x] Ergebnis-Eingabe, automatische Siegerweitergabe, Turniersieger-Doppel sowie sichere Endrunden-Rücknahme ohne Änderung der Vorrunde
- [x] Bestehende Wertungen während aktiver Endrunde geschützt; nach einer Änderung des K.-o.-Siegers werden nachfolgende Ergebnisse zurückgesetzt
- [x] `tests/finals.test.mjs` (14 Logiktests) und `tests/finals-ui.test.mjs` (Bedienablauf)
- [x] **v0.5.0:** Nenngeld (nur bar): Standardbetrag je Turnier, individueller Betrag je Spieler, Zahlungseingänge und Korrekturen
- [x] Kassenansicht mit Soll, bar erhalten, offen, Teilzahlungen und Überzahlungen
- [x] Spiel- und Pausenzeiten pro Runde und pro Match im Spielplan, einschließlich Wechselpause und Mitternachtswechsel
- [x] Rundenuhr mit Start/Pause/Fortsetzen/Beenden/Zurücksetzen, Countdown und Überzeit; Zeitstempel überstehen Browser-Neuladen und JSON-Sicherungen
- [x] Nur eine Rundenuhr darf gleichzeitig laufen; nach Neuauslosung werden alte Rundenuhren gelöscht
- [x] `tests/operations.test.mjs` (15 Logiktests) und `tests/operations-ui.test.mjs` (Kassen- und Uhr-Bedientest)
- [x] **v0.5.1:** Anwesenheit, Spielstärke, Nenngeld-Kategorie, Soll/Bar erhalten/offen und manuelle Korrekturen in **einer gemeinsamen Teilnehmerliste**; gesonderter Nenngeld-Menüpunkt entfällt
- [x] Frei konfigurierbare Nenngeld-Kategorien pro Turnier (z. B. Jugend und Erwachsene); in Einstellungen anlegen, bearbeiten und nur löschen, wenn nicht mehr zugewiesen
- [x] Individuelle Kategorieauswahl je Teilnehmer direkt in der Liste oder im Bearbeiten-Dialog; Sonderbeträge werden beim bewussten Kategorienwechsel nach Bestätigung aufgehoben, tatsächlich erhaltene Zahlungen bleiben erhalten
- [x] Bestehende Turniere und JSON-Backups automatisch auf Kategorie „Standard“ mit bisherigem Nenngeld migriert; Barzahlung, Anwesenheit, Spielplan und Rundenuhr bleiben erhalten
- [x] Zusätzliche Tests `tests/fee-tiers.test.mjs` (11 Fälle) und `tests/fee-tiers-ui.test.mjs` (gemeinsamer Check-in); insgesamt **79 Logiktests und 5 simulierte UI-Tests** bestanden
- [x] **v0.6.0: separater Live-Monitor** unter `site/live.html` mit großen Spielpaarungen und Platznamen, Ergebnissen/Siegern, Schleifchen-Topliste, Countdown/Überzeit, Auffüllrunde und K.-o.-Endrunde samt Sieger-Doppel
- [x] Neue Vollbildschaltfläche; Live-Monitor aus der Turnierleitung in weiterem Browserfenster öffnen und an den zweiten Monitor verschieben
- [x] Die Turnierleitung kann einzelne Runden oder die Endrunde ausdrücklich auswählen; sonst wird die gerade laufende Runde automatisch angezeigt. Auswahl wird als `liveDisplay` im lokalen Turnier gespeichert
- [x] Datenaktualisierung im zweiten Fenster per `storage`-Ereignis und ergänzender Sekundenprüfung; kein Nenngeld/Bezahlstatus oder Bearbeiten auf der Anzeige
- [x] Zusätzliche Tests `tests/live.test.mjs` (14), `tests/live-ui.test.mjs` (5) und zwei UI-Synchronisations-/Bedientests; **98 Logik-/Darstellungsprüfungen + 7 simulierte UI-Tests = 105 bestanden**
- [x] **v0.6.1: unabhängige Fernanzeige**: Turnierleitung startet sie ausdrücklich und erhält kopierbaren Zuschauer-Link. Externe Laptops, Tablets und Smart-TVs mit Browser lesen über `site/live-feed.php` aktualisierte Paarungen, Ergebnisse, Zwischenstand und Rundenuhr.
- [x] Getrennter starker Lese- und Schreibschlüssel; der Schreibschlüssel bleibt in einem eigenen Browser-Speichereintrag, nicht im Zuschauer-Link und nicht im JSON-Backup. Ein geteiltes Fernanzeige-Kennwort berechtigt nur zum Lesen.
- [x] PHP-Dienst mit datensparsamem Whitelisting, temporärer Dateispeicherung **außerhalb des öffentlichen Dokumentenverzeichnisses**, Ablauf nach 24h ohne neue Veröffentlichung und sofortigem Link-Widerruf. **Kein** Abgleich der vollständigen Turnier-/Nenngeld-Daten.
- [x] Eigene Live-Ansicht pollt Server ungefähr alle 3 Sekunden; Countdown basiert auf Server-Zeitstempel statt absoluter Uhrzeit des TV-Geräts; bei unterbrochener Übertragung bzw. Widerruf Hinweis/Warteansicht.
- [x] Neue `tests/remote-live.test.mjs` (8), `tests/live-feed.test.mjs` (PHP-Integration), `tests/remote-publisher-ui.test.mjs` und `tests/remote-viewer-ui.test.mjs`; **116 Tests erfolgreich**, PHP-Syntax und echte API-Requests im GitHub-Testlauf [42042177880](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42042177880). Kein Deployment in diesem Testlauf.

**Prüfstand:** Letzter bestätigter FTPS-Upload ist **v0.6.0** (Run `42037542292`). **v0.6.1** mit separatem PHP-Live-Zwischenspeicher, Opt-in-Freigabe und unabhängigem Zuschauer-Link liegt im GitHub-Code. Der automatische [GitHub-Testlauf 42042177880](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42042177880) hat **116 Tests und die PHP-Syntaxprüfung erfolgreich** abgeschlossen, einschließlich einer lokalen API-Integration. **Noch kein Upload und kein echter ALL-INKL-/Smart-TV-/Zweitgeräte-Funktionstest.** Der PHP-Dienst setzt PHP 8.2+ und beschreibbares Server-Temp-Verzeichnis voraus. Apache-Passwortschutz am externen Viewer bleibt vorläufig aktiv. Keine Freigabe für reale Turniere und keine Cloud-Mehrgeräte-Bearbeitung.

## Nicht implementiert

- [ ] Eigenständiger Doppelturniermodus und One Point Cup (Schleifchenturnier-Endrunde mit v0.4.0 veröffentlicht; erster positiver Funktionseindruck)
- [ ] Vollständige zentrale Mehrgeräte-Datenbank und gemeinsame Turnierbearbeitung (die **lesende** PHP-Fernanzeige der Spielstände ist in v0.6.1 implementiert und wartet auf den Webhosting-Praxistest)
- [ ] Eigenständige Verwaltung von Doppelturnieren mit dauerhaft festen Teams über alle Turnierrunden
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
| Für v0.6.1 vorgesehene Upload-Dateien | 19 ausdrücklich freigegebene Dateien: `site/index.html`, `site/live.html`, `site/live-feed.php`, `site/favicon.png` sowie `site/assets/styles.css`, `storage.js`, `draw.js`, `results.js`, `special.js`, `finals.js`, `finals-ui.js`, `operations.js`, `operations-ui.js`, `app.js`, `live.css`, `live-model.js`, `live-ui.js`, `live.js`, `remote-live.js` |
| Zugangsdaten | Nur als GitHub-Actions-Secrets `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`; **keine Werte dokumentieren** |

**Workflow-Wartung 2026-11-05:** `actions/checkout@v7`, `actions/setup-node@v7`, `ubuntu-24.04` (statt `ubuntu-latest`) und Checkout ohne persistierte Git-Zugangsdaten. Diese Änderung ist im GitHub-Code gespeichert; der Nutzer hat anschließend berichtet, dass keine Warnungen mehr angezeigt werden; ein Workflow-Log dieser Meldung wurde hier nicht erneut gesichtet. Der Upload bleibt manuell.

**Wichtig:** Der Workflow lädt ausschließlich 19 explizit freigegebene Dateien einschließlich Monitorseite und Live-Modulen hoch, ersetzt nicht `.htaccess` und löscht keine anderen Dateien. Die ursprüngliche ALL-INKL-`index.htm` kann noch bestehen; die App deshalb zunächst explizit mit `/index.html` öffnen. Passwortschutz nicht entfernen. Die Hauptwebsite `tennis-schiri.de` bleibt davon getrennt.

## SaaS-Backend, Registrierung und Abrechnung – B0.1/B0.2 im Repository

**Stand (2026-11-05):** Der Nutzer hat die Backend-Entwicklung bestätigt. **B0.1 (Datenmodell) und B0.2 (private Konto-/Vereinsdienste und deaktivierte JSON-API) sind in GitHub implementiert und gegen Wegwerf-MariaDB getestet.** E-Mail-Bestätigung, Login/Logout, sichere Sitzungen, Passwort-Reset, Vereinsanlage, Einladungen und Rollentrennung sind im privaten Code vorhanden; **keine öffentliche Registrierung, keine ALL-INKL-Produktivdatenbank und keine veröffentlichte Konto-Oberfläche**. Einzelheiten in [backend/HTTP_API.md](backend/HTTP_API.md), Architektur in [BACKEND_KONZEPT.md](BACKEND_KONZEPT.md).

- [x] **B0.1:** Private SQL-Migration für 12 Tabellen (Benutzer, Vereine, Vereinsmitgliedschaften, Einladungen, Sessions, Reset-/Bestätigungstokens, Lizenzpläne, Lizenzen, Audit) und getrennte PHP-Rollen-/Sicherheitsregeln implementiert.
- [x] CLI-only-Migrationsskript mit ausdrücklicher Freigabe/Prüfsumme sowie GitHub-Verifikation gegen eine temporäre MariaDB; **keine echten Zugangsdaten oder Installationen auf ALL-INKL**.
- [x] **B0.2 Backend:** Registrierung mit E-Mail-Bestätigung/erneutem Versand, Login/Logout, 12-Stunden-Sessions mit CSRF, Passwort-Reset samt Sitzungswiderruf, Vereinsanlage + erster Besitzer in einer Transaktion, Einladungen/Annahme, Rollenänderungen und Schutz des letzten Besitzers.
- [x] **Sicherheit B0.2:** Passwort-Hashing, Token nur als SHA-256 in der Datenbank, sichere Cookie-Optionen, Same-Origin-Schreibschutz, persistente HMAC-basierte Quoten, API standardmäßig abgeschaltet und vom bestehenden FTPS-Upload ausgeschlossen.
- [x] **B0.2 Tests:** PHP-/Node-Regressionsprüfungen und Integration gegen separate CI-MariaDB inklusive verweigertem Fremdvereinszugriff, abgelaufener Sitzung/Reset, Einmal-Einladungen, Login-Limits, CSRF und Login-Cookies.
- [x] **B0.2 Konto-UI im privaten Code:** isolierte Konto-Testseite unter `backend/staging-ui/` für Registrierung, Login, E-Mail-Bestätigung, Reset, Vereinsanlage, Mitglieder, Rollen und Einladungen. Responsive TENNILO-Optik; **nicht veröffentlicht**. Dazu `tests/account-staging-ui.test.mjs`.
- [ ] **B0.2 Staging/Freigabe:** geprüfter Mailtransport, getrennte ALL-INKL-Testdatenbank, gesicherte Bereitstellung, vollständige Browser-E2E-Tests und Sicherheitsreview. **Nicht freigegeben.**
- Personen registrieren sich mit bestätigter E-Mail; die **Organisation/Verein** ist Eigentümer der Turniere und kauft die Lizenz.
- Rollen: Besitzer, Organisator, Leser sowie separater schreibgeschützter Zuschauer. Ein Nutzer kann mehreren Vereinen zugeordnet sein.
- Zielbild ALL-INKL: PHP-API, MariaDB/MySQL, serverseitige Sessions/Autorisierung, Datenmigration aus lokalen/JSON-Turnieren, Revisionen, Backups und Rechteprüfung. Konkretes Paket erst prüfen.
- **Nenngeld bleibt bar beim Verein**; TENNILO-Lizenzgebühren sind ein anderes Abrechnungssystem und können später über einen externen Zahlungsdienst eingezogen werden.
- Nur als **Diskussionsvorschlag**, nicht als Produkt-/Preisbeschluss: Demo kostenlos, einzelnes Turnier ca. 14,90 €, Vereins-Jahreslizenz ca. 99 €, größerer Veranstalter auf Anfrage.
- Fachliche Reihenfolge: B0.1 und privater B0.2-Code **erledigt** → B0.2 Staging-/Konto-Oberfläche und Mailzustellung → B0.3 serverseitige Turniere mit JSON-Import → Lizenzprüfung und Pilotzugang → Checkout/Rechnung/Zahlungen → Pilotbetrieb; den geräteübergreifenden v0.6.1-Live-Monitor parallel im Browser prüfen. Bis dahin keine Freigabe für echten SaaS-Vertrieb.

## Nächster sinnvoller Entwicklungsschritt

1. **Getrennte ALL-INKL-Testumgebung prüfen:** Verfügbarkeit von PHP 8.2+, PDO-MySQL, Datenbank, sicheren privaten Verzeichnissen, Mailversand, Sicherung und ggf. CLI/SSH im konkreten Tarif klären. Keine Zugangsdaten ins Repository oder in den Chat schreiben.
2. **B0.2-Oberfläche im echten Browser prüfen:** Der isolierte Prototyp unter `backend/staging-ui/` ist erstellt. Konto-/Anmeldeseiten, E-Mail-Bestätigung, Passwort-Reset, Vereinsanlage, Mitgliedereinladungen und Rollen sind mit den privaten API-Routen verdrahtet. Als Nächstes sind sichere Testinstallation und Browser-E2E-Prüfung nötig; `TENNILO_API_ENABLED` bleibt ausgeschaltet.
3. **Staging absichern und testen:** Mailzustellung/Absender, HTTPS- und Cookie-Pfade, Same-Origin/CSRF, Rate-Limit, Rechte für mehrere Vereine und Wiederherstellung aus Backup verifizieren. Erst danach Testnutzer zulassen.
4. **B0.3 später:** Schleifchenturniere zentral in die Datenbank übertragen, alte JSON-Daten kontrolliert importieren, Mehrgeräte-Bearbeitung sicher machen. Danach Lizenzvergabe und Software-Bezahlung; Nenngelder weiterhin zunächst bar.
5. **Offener Praxistest:** Fernanzeige 0.6.1 von einem echten zweiten Gerät prüfen. Dafür nicht unkontrolliert Backend/Registrierung veröffentlichen.

### Google Drive und fachliche Quellen

Im übergeordneten [Drive-Projektordner](https://drive.google.com/drive/folders/1wasNarP_HEA4o0zqGLlBumfzObEytnjl) gibt es die bestehende Bibliothek [„Turnierformate“](https://drive.google.com/drive/folders/1aPuhuzKZvif5RnfXXVcJsGCkRL6wepfs). Ergänzend wurde ein eigener Ordner [„TENNILO – Dokumentation“](https://drive.google.com/drive/folders/1w6WBQH0o5MEwnKn3ZuuN43HiHaxvMnBg) mit einem [Projektwegweiser](https://docs.google.com/document/d/1d9Gx6AahC1RbEVFtavmo4Y8UAU7_R6EzmmiWQ5mlZr8/edit) eingerichtet.

Thematische Links zu den vorhandenen PDF- und Excel-Turnierformaten stehen in [QUELLEN_TURNIERFORMATE.md](QUELLEN_TURNIERFORMATE.md). **GitHub bleibt die führende Quelle für technische Versionsstände und Entscheidungen; die Original-Vorlagen in Drive werden nicht verändert.**

### Quelle für Turnierregeln

Bestehende Google-Tabelle: [„Turniere Verein – Auslosung & Livetabelle“](https://docs.google.com/spreadsheets/d/1aNwzYXmHhpONZURtufkDg6qZHX1-ywOYgyRd_u_LHCY/edit). Enthält Schleifchenturnier, Doppelturnier und One Point Cup sowie Apps Script. **Nicht** annehmen, dass die Tabellenlogik bereits auf die Web-App übertragen wurde.

### Für neue Chats

> Wir arbeiten an **TENNILO** (Arbeitstitel), der Tennis-Turnier-App von Tennis-Schiri. Bitte öffne im privaten GitHub-Repository `tennis-schiri/tennis-schiri-app` zuerst `PROJEKTSTATUS.md`, `ENTSCHEIDUNGEN.md` und `CHANGELOG.md`, prüfe den aktuellen Code und setze beim nächsten offenen Schritt fort. Veröffentlichung ausschließlich nach ausdrücklicher Freigabe; GitHub-Implementierung nicht mit Live-Deployment gleichsetzen.

### Aktualisierungsregel

Nach jedem größeren Entwicklungsschritt **diese Datei** aktualisieren: Versionsstand im Code, tatsächlich bestätigter Live-Stand, fertig vs. offen, Testergebnisse, konkrete nächste Aufgabe. Entscheidungen und Versionsänderungen zusätzlich in `ENTSCHEIDUNGEN.md` und `CHANGELOG.md` eintragen.
