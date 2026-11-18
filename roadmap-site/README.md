# TENNILO – gemeinsame Roadmap auf roadmap.tennilo.de

Eigenständiges, **passwortgeschütztes** Roadmap-Portal für TENNILO Tournament, Score, Umpire, Business und gemeinsame Plattformfunktionen.

## Bereits im Repository vorbereitet

- Eigene Einstiegsseite mit Original-TENNILO-Logos und Links zur Tournament- und Score-Demo.
- Interaktives Roadmap-Board mit 50 Themen (33 bestehende Tournament-Einträge und 17 zusätzliche Produkt-/Plattformthemen); Status, Suche, Prioritäten, Produktfilter und Detailansichten.
- Vollständige 16-teilige Roadmap aus Google Drive als geschützte Seite `strategie.php`.
- Bestehende Nutzerverwaltung übernommen: Eigentümerkonto, Rollen `viewer` und `commenter`, Kommentare, persönliche Einladungen mit einmalig gültigem Link für sieben Tage sowie Sperrung.
- PHP-Seed statt direkt öffentlich abrufbarer `roadmap-seed.json`. API und Seiten verweigern ungeschützte HTTP-Anfragen.
- Separates **manuelles** GitHub-Actions-Deployment, unabhängig von der Tournament-App.

Der GitHub-Push veröffentlicht **keine Website**. Es gibt lediglich einen Workflow-Registrierungslauf ohne FTPS.

## 1. Domain schützen – vor jedem Upload

Die Subdomain `roadmap.tennilo.de` muss auf ein **eigenes** Hosting-Verzeichnis zeigen. Im ALL-INKL-KAS den **Verzeichnisschutz / HTTP Basic Auth für dieses komplette Verzeichnis** einschalten und HTTPS aktivieren. Ein Aufruf ohne Anmeldung von `https://roadmap.tennilo.de/` muss mit HTTP **401 Unauthorized** antworten. Sonst stoppt der neue Workflow vor dem FTPS-Upload.

Wichtig: Der Basic-Verzeichnisschutz ist eine äußere Zugangsschranke. Die Roadmap selbst hat zusätzlich **persönliche Konten** und verschiedene Rollen. Ein persönlicher Einladungslink ersetzt **nicht** das allgemeine Verzeichnispasswort. Für eingeladene Personen ist beides nötig.

## 2. Dauerhaften privaten Speicher vorbereiten

Der PHP-Dienst verlangt den privaten Ordner `../tennilo-roadmap-private`, ausgehend vom Webroot der Subdomain:

- **außerhalb** des gesamten öffentlich erreichbaren Webverzeichnisses;
- Verzeichnisrechte **0700** und schreibbar für den PHP-Webserver;
- eine Datei `.htaccess` mit **exakt** dem Inhalt `Require all denied` im privaten Ordner;
- keine öffentliche Symlink-Verbindung in den Speicher;
- nicht in GitHub oder per Website-Workflow hochladen.

Der Dienst verweigert seinen Betrieb (HTTP 503), wenn der private Speicher nicht sicher vorhanden ist. Falls der Hosting-Account es erfordert, kann `TENNILO_ROADMAP_STORAGE_DIR` als serverseitige **absolute** Verzeichnisangabe gesetzt werden. GitHub Secrets allein ändern **keine** PHP-Umgebungsvariablen auf dem Webserver.

### Bestehende Nutzer und Kommentare

Die frühere Roadmap im Tournament-Projekt speichert redaktionelle Änderungen, persönliche Accounts, Einladungen und Kommentare serverseitig in `state.json`, **nicht** in GitHub. Vor dem Umzug eine Sicherung davon anfertigen. Wenn alte und neue Subdomain auf dasselbe zulässige private `../tennilo-roadmap-private` zeigen, können sie die bestehenden Daten gemeinsam verwenden. Wenn es unterschiedliche private Ordner sind, die alte `state.json` ausschließlich per ALL-INKL WebFTP/Dateimanager **privat in den neuen Speicher kopieren** – vor dem ersten Login, nach Backup und **ohne die Quelldatei zu löschen**. Keinesfalls `state.json` im öffentlichen Webroot oder GitHub speichern.

Nach dem Umzug Login, Rollen, bestehende Kommentare und Einladungen kontrollieren, bevor neue Personen eingeladen werden. Die Roadmap-API hat keine Verbindung zum noch nicht produktiven allgemeinen TENNILO-Kontosystem.

## 3. GitHub Secrets setzen

Repository: `tennis-schiri/tennis-schiri-app`

Unter `Settings → Secrets and variables → Actions → New repository secret` diese **drei** Repository-Secrets anlegen:

| Secret | Wert |
| --- | --- |
| `ROADMAP_FTP_HOST` | FTP-Host aus ALL-INKL, **ohne** `ftp://` |
| `ROADMAP_FTP_USER` | FTP-Benutzer nur für die neue Roadmap-Subdomain |
| `ROADMAP_FTP_PASSWORD` | zugehöriges FTP-Passwort |

**Keine Zugangsdaten in Chat, README, Code, Google Drive oder GitHub Issues schreiben.** Es wird kein `FTP_REMOTE_DIR` benötigt: der verwendete FTP-Benutzer muss direkt im Verzeichnis von `roadmap.tennilo.de` starten. Bestehende `FTP_*`-Secrets der Tournament-App bleiben unverändert.

Secrets: https://github.com/tennis-schiri/tennis-schiri-app/settings/secrets/actions

## 4. Manuell veröffentlichen

**Direkter Actions-Link:**
https://github.com/tennis-schiri/tennis-schiri-app/actions/workflows/roadmap-subdomain.yml

Dort `Run workflow → main → Run workflow` auswählen. Nur bei manuellem Start prüft der Workflow PHP und JavaScript, bereitet die **originalen Markenlogos** aus dem öffentlichen TENNILO-Website-Repository vor, prüft HTTP 401 und lädt anschließend ausschließlich 15 freigegebene Roadmap-Dateien hoch.

Keine `.htaccess` oder private Serverdateien werden angerührt.

Falls ALL-INKL trotz `index.html` noch seine Standardseite anzeigt, einen alten `index.htm`-Platzhalter nur im neuen Subdomain-Verzeichnis prüfen/entfernen und die Domain direkt über `/index.php` testen. Kein automatisches Veröffentlichen und kein Löschen fremder Dateien.

## 5. Inhaltspflege

- Bestehende Tournament-Themen: `site/roadmap-seed.json`
- Ergänzungen für Score, Umpire, Business und Plattform: `roadmap-site/additions.json`
- Zusammenführung beim Upload: `roadmap-site/regenerate-seed.mjs`
- Vollständiges Strategie-Original: `roadmap-site/strategie-source.txt`; daraus wurde `roadmap-site/strategie.php` erstellt. Änderungen an der Google-Drive-Roadmap später in beiden Quellen nachführen.
- Interaktives Board: `roadmap-site/roadmap.js`; neue Seiten und Design: `roadmap-site/index.php`, `roadmap-site/extra.css`.
- PHP-Einladungs-/Zugangslogik: `roadmap-site/roadmap-api.php` und `roadmap-site/roadmap-lib.php`; Servercode aus dem bewährten Tournament-Roadmap-Modul übernommen.

Achtung: Seed-Merge soll vorhandene Kommentare und manuelle Statusänderungen nicht überschreiben. Zentrale Roadmap künftig nur auf dieser neuen Domain weiterpflegen. Der ältere Tournament-Roadmap-Bereich bleibt bis zum geprüften Umzug bestehen.

## 6. Produkt-Demos

- Tournament: https://app.tennis-schiri.de/index.html (separater Testseiten-Zugang möglich)
- Score: https://score.tennilo.de/ (Testadresse, ggf. noch nicht öffentlich)
- Umpire: Der Roadmap-Bereich ist vorbereitet. Solange die Umpire-Demo nicht zuverlässig veröffentlicht ist, zeigt die neue Website bewusst keinen aktiven Demo-Link.
- Business: Konzeptphase.

Eine neu vergebene Roadmap-Einladung gewährt **keinen automatischen Zugriff** auf andere geschützte Demos. Das ist getrennt zu verwalten.

## Sicherheits- und Freigabegrenzen

Diese Änderung liegt im GitHub-Repository, ist aber vor dem erfolgreichen manuellen Workflow **nicht live**. Da die Domain und deren Verzeichnisschutz nicht mit der GitHub-Verbindung verwaltet werden können, muss die Serverkonfiguration bei ALL-INKL vor dem Upload bestätigt werden. Ein erfolgreicher GitHub-Build beweist noch nicht, dass auf dem echten Hosting PHP-Basic-Auth, Dateirechte, bestehende Konten und Speicherung funktionieren. Diese Funktionen direkt auf dem Server nachtesten.
