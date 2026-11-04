# Tennis-Schiri · Turniermanager

Private Web-App für https://app.tennis-schiri.de (ALL-INKL Privat, passwortgeschützte Subdomain).

## Version 0.2: Turniere & Teilnehmer

- Mehrere Schleifchenturniere anlegen, auswählen, bearbeiten und löschen.
- Turniername, Datum, Startzeit, Spieldauer, Wechselzeit, Spiele pro Spieler und aktive Plätze festlegen.
- Teilnehmende hinzufügen, bearbeiten, löschen, Spielstärke (Stark/Schwächer) verwalten und Anwesenheit umschalten.
- Dashboard mit Teilnehmerzahlen, Platzkapazität und Hinweisen zu Stärkegruppen.
- Import und Export der Turnierdaten als JSON-Sicherung.
- Responsive Bedienung auf Smartphone, Tablet und Desktop.

**Wichtige Einschränkung:** Dies ist weiterhin eine **lokale Browser-Testversion**. Alle Turnier- und Teilnehmerdaten werden im lokalen Browser gespeichert (localStorage), nicht in einer gemeinsamen Serverdatenbank. Daten synchronisieren sich nicht zwischen Geräten. Zur Sicherung unbedingt den Button „Daten sichern“ verwenden. Keine echten sensiblen Spielerdaten zur Erprobung verwenden, bevor Datenschutz, Benutzerrollen und Backups umgesetzt sind.

**Nicht enthalten:** Automatische Auslosung, Ergebnisse, Play-offs, Livetabelle, Login innerhalb der App, Vereinslizenzen, Live-Synchronisation.

## Projektstruktur

- `site/index.html` – statisches HTML-Grundgerüst
- `site/assets/styles.css` – Layout, Design, responsives CSS
- `site/assets/app.js` – Benutzeroberfläche und Interaktionen
- `site/assets/storage.js` – austauschbarer Datenadapter / Speichermodell v1
- `.github/workflows/deploy.yml` – manuelle Veröffentlichung per FTPS

## Veröffentlichung

1. In GitHub `Actions → Tennis-Schiri App manuell veröffentlichen` wählen.
2. `Run workflow` auf Branch `main` manuell auslösen.
3. Vier explizite Dateien werden via verschlüsseltes FTPS hochgeladen; keine Server-Dateien werden gelöscht.
4. App nach Eingabe des Verzeichnispassworts unter **https://app.tennis-schiri.de/index.html** öffnen.
5. Die ALL-INKL-Standarddatei `index.htm` bleibt zunächst bestehen. Daher bewusst die URL mit `/index.html` verwenden.

GitHub-Secrets: `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`. Keine Zugangsdaten ins Repository speichern. Der FTP-Nutzer muss auf das korrekte App-Verzeichnis eingeschränkt sein. WordPress und `.htaccess` nicht überschreiben.

## Roadmap

- v0.3: Schleifchen-Auslosung aus dem vorhandenen Turnierregelwerk übernehmen und mit Tests absichern.
- v0.4: Ergebnisse und Tabellen.
- Backend: PHP/MariaDB mit Benutzerrollen, serverseitiger Validierung, Datenschutz und Backups. Der lokale Datenadapter kann dann durch einen API-Adapter ersetzt werden.
