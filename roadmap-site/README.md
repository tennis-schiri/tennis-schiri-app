# TENNILO – gemeinsame Roadmap auf roadmap.tennilo.de

Geschütztes Roadmap-Portal mit persönlichem Login für TENNILO Tournament, Score, Umpire, Business, Plattformthemen **und die eigenständige Wer-muss-Mini-App-Familie**. Mini-Apps gehören nicht zur TENNILO-Marke; nur die Planung läuft gemeinsam.

## Bedienkonzept

1. `https://roadmap.tennilo.de` zeigt das TENNILO-Login: **Benutzername + Passwort** (ohne Browser-Verzeichnisdialog).
2. Nach Anmeldung: produktübergreifendes Roadmap-Board mit 96 initialen Themen (darunter 23 detaillierte Score-Aufgaben), Suche, Kanban-/Listenansicht, Prioritäten, Meilensteinen, Kommentaren und Demo-Links.
3. `strategie.php` zeigt alle 18 Kapitel der Gesamtplanung (17 TENNILO-Kapitel plus eigenständige Mini-App-Ergänzung) – **nur mit gültiger Sitzung**; Gäste werden auf das Login weitergeleitet.
4. Projektleitung kann Benutzer einladen und sperren: einmalige Einladungslinks, sieben Tage gültig; eingeladene Personen legen eigenen Benutzernamen und eigenes Passwort fest. Rollen: nur lesen oder kommentieren.
5. Gäste bekommen serverseitig **keine Roadmap-Einträge**, keine Kommentare und keine Benutzerdaten. Die API gibt ihnen lediglich das für den Login notwendige CSRF-Token und die Sitzungsangabe zurück.

**Keine Browser-Basic-Auth aktivieren.** Die ursprüngliche Roadmap der Turnier-App bleibt unberührt, bis die neue Subdomain vollständig abgenommen ist.

## Hosting: ALL-INKL

- Eigene Subdomain `roadmap.tennilo.de` im separaten Verzeichnis.
- HTTPS muss funktionieren (gültiges Zertifikat).
- PHP **8.2 oder neuer**; Sessions und Dateizugriffe aktiv.
- Der FTP-Benutzer muss **im Webverzeichnis der Subdomain starten**. `FTP_REMOTE_DIR` wird nicht benötigt.
- **Kein Verzeichnisschutz auf dem öffentlichen Roadmap-Verzeichnis**. Der Zugriff wird durch die serverseitige Benutzeranmeldung gesteuert.

### Privater dauerhafter Speicher – weiterhin erforderlich

Die Passwörter sind als `password_hash` gespeichert, Tokens als Hash. Benutzer, Kommentare, Rollen und manuelle Änderungen liegen ausschließlich in der privaten `state.json`, nicht in GitHub.

Dafür muss ein schreibbarer Ordner `../tennilo-roadmap-private` **außerhalb des gesamten öffentlich erreichbaren Webroots** existieren. Anforderungen:
- Verzeichnisrechte **0700** (ALL-INKL WebFTP/KAS);
- `.htaccess` mit exakt `Require all denied` **in diesem privaten Ordner**, nicht auf der Roadmap-Website;
- keine öffentliche URL und kein Symlink auf den privaten Speicher.

Das ist **nicht** der abgelehnte Verzeichnisschutz der Website, sondern eine zusätzliche Absicherung der privaten Daten. Fehlt der sichere Speicher, verweigert die API den Betrieb statt offen zu starten.

Wenn ALL-INKL einen eigenen absoluten Speicherpfad anbietet, kann `TENNILO_ROADMAP_STORAGE_DIR` serverseitig darauf gesetzt werden. Eine GitHub-Actions-Variable setzt diesen Wert **nicht** auf dem PHP-Server.

### Bestehende Daten übernehmen

Vor dem Umzug der alten Roadmap den privaten `state.json`-Stand sichern. Bei gemeinsamer privater Speicherstruktur kann die neue Domain dieselben Daten verwenden. Andernfalls `state.json` außerhalb des Webroots in den privaten Zielordner kopieren, **bevor** erstmals neue Nutzer angemeldet werden. Der alte Stand bleibt als Backup erhalten; niemals eine echte `state.json` auf einen öffentlichen FTP-Webpfad, ins Repo oder in eine Demo kopieren.

Bestehende Konten haben Vorrang. Normalerweise werden die Secrets **nur beim erstmaligen Anlegen eines Eigentümerkontos** verwendet. Neue Secrets ändern ein bestehendes Passwort nicht automatisch.

**Falls die Admin-Anmeldung nicht mehr funktioniert:** Vor dem Upload `ROADMAP_ADMIN_USERNAME` und `ROADMAP_ADMIN_PASSWORD` prüfen. Unter **Actions → TENNILO Roadmap → Run workflow** die Option `reset_admin_login` auf **true** setzen. Damit wird der Admin-Zugang einmalig auf die Werte dieser beiden Secrets gesetzt. Alle Roadmap-Themen, Kommentare, anderen Benutzerkonten, Einladungen und Rollen bleiben erhalten. Der Reset greift beim nächsten Aufruf der Roadmap-API und wird anhand der Workflow-Laufnummer als einmalig angewendet. Ohne aktivierte Option werden vorhandene Admin-Konten nicht verändert. Falls ein Benutzer nach fünf falschen Anmeldeversuchen vorübergehend gesperrt ist, 15 Minuten abwarten und erst dann erneut anmelden.

## GitHub Secrets: fünf Werte

Repository: `tennis-schiri/tennis-schiri-app`

https://github.com/tennis-schiri/tennis-schiri-app/settings/secrets/actions

| Secret | Wert |
| --- | --- |
| `ROADMAP_FTP_HOST` | FTP-Host von ALL-INKL, ohne `ftp://` |
| `ROADMAP_FTP_USER` | separater FTP-Nutzer, der im Roadmap-Verzeichnis startet |
| `ROADMAP_FTP_PASSWORD` | FTP-Kennwort |
| `ROADMAP_ADMIN_USERNAME` | selbst gewählter Admin-Benutzername, 3–40 Zeichen: a–z, Zahlen, Punkt, Bindestrich, Unterstrich (nicht „admin“, „gast“ oder „system“) |
| `ROADMAP_ADMIN_PASSWORD` | starkes Admin-Passwort, mindestens 16 Zeichen (16–72 Bytes) |

Das Admin-Passwort wird im CI zu einem Passwort-Hash verarbeitet und **niemals im Repository** gespeichert oder im Actions-Log ausgegeben. `roadmap-initial-admin.php` wird erst beim manuell gestarteten Workflow aus den Secrets erzeugt und nur als ausführbares, nicht als Text auslieferbares PHP auf den Server übertragen. Direkter Zugriff antwortet mit HTTP 404.

**Secrets ausschließlich in GitHub eingeben; nicht im Chat mitteilen.**

## Veröffentlichung: manuell

**Direkter GitHub-Actions-Link:**
https://github.com/tennis-schiri/tennis-schiri-app/actions/workflows/roadmap-subdomain.yml

Auf `Run workflow → main → Run workflow` klicken. Push auf `main` registriert den Workflow lediglich, lädt nichts live hoch.

Der manuelle Workflow:
- übernimmt die **Original-TENNILO-Logos** aus dem Website-Repository;
- kombiniert 33 bisherige Tournament-Themen und 63 zusätzliche Aufgaben einschließlich 16 eigenständiger Mini-App-Themen (einschließlich 23 detaillierter Score-Aufgaben, drei Web-Demo-Meilensteinen, dem ersten realen Gerätetest vom 17.11.2026 sowie Padel, Pickleball und Beach Tennis);
- generiert die geschützte Seed-PHP-Datei und die initiale Admin-Konfiguration;
- prüft Syntax, bestehende Roadmap-Tests und HTTPS;
- überträgt nur die **17** ausdrücklich freigegebenen Dateien per FTPS, ohne zu löschen, ohne `.htaccess` zu ersetzen und ohne die Tournament-App zu verändern;
- prüft **nach** dem Upload live: Gast-API muss null Inhalte zurückgeben, `strategie.php` ohne Anmeldung auf Login umleiten und die Seed-PHP-Datei 404 liefern.

Ein erfolgreiches GitHub-Protokoll ist kein Ersatz für den persönlichen Test von Login, Einladung, Kommentaren und Sicherungen im echten Browser.

## Demos

- TENNILO Tournament: https://app.tennis-schiri.de/index.html
- TENNILO Score: https://score.tennilo.de/
- Umpire: Demo-Link erst nach bestätigter Veröffentlichung eintragen.
- Business: Konzeptphase.

Die Demo-Links werden **nach dem Login** im Roadmap-Portal angezeigt. Ein Roadmap-Konto vergibt keinen automatischen Zugang zu separat geschützten Demos.

## Projektdateien

- `roadmap-site/index.php`: Website-Einstieg, HTTPS, sichere Header
- `roadmap-site/roadmap.js`: Login und interaktives Roadmap-Board
- `roadmap-site/roadmap-api.php`: persönliche Anmeldung, Einladungslinks, Rechte und geschützte Roadmap-Daten
- `roadmap-site/roadmap-session-guard.php`: Prüfung einer gültigen Sitzung für die Strategie
- `roadmap-site/strategie.php`: geschützte vollständige Planung
- `roadmap-site/roadmap-lib.php`: Datenmodell, Speicherung und Sicherheitsprüfungen
- `roadmap-site/regenerate-seed.mjs`: kombiniert `site/roadmap-seed.json` und `roadmap-site/additions.json`
- `roadmap-site/make-admin-config.php`: erstellt Admin-Hash ausschließlich in GitHub Actions
- `roadmap-site/make-favicon.py`: erzeugt aus dem **Original-TENNILO-Icon** `favicon.ico`, `favicon-32.png`, `favicon-192.png` und `apple-touch-icon.png` (transparente Außenbereiche bleiben erhalten)
- `roadmap-site/extra.css`: Login- und Portalgestaltung
- `.github/workflows/roadmap-subdomain.yml`: manueller FTPS-Upload

**Hinweis zur Vertraulichkeit:** Dieses Repository ist öffentlich. Auch wenn die **Website selbst** erst nach Login Einträge ausgibt, liegt ein Teil der Roadmap-Fachplanung weiterhin als Quelltext im öffentlichen Repository. Falls auch die Planungsinhalte selbst vertraulich sein müssen, gehört die Quelle in ein privates Repository. Der Login allein versteckt GitHub-Dateien nicht.

## Roadmap-Fortschrittsabgleich – täglich

- `roadmap-site/daily-review.mjs` ermittelt GitHub-Commits von Tournament, Score, Umpire und TENNILO Website aus einem überlappenden 36-Stunden-Fenster.
- `.github/workflows/roadmap-daily-review.yml` läuft täglich um 05:13 UTC (06:13 MEZ / 07:13 MESZ) und ist zusätzlich manuell startbar. Der Workflow aktualisiert **ein einziges GitHub-Issue** `TENNILO Roadmap Tagesabgleich` mit Commit-Links, ohne Live-Upload oder automatische Status-Freigabe.
- Explizite Aufgabenreferenzen in Commit-Nachrichten werden als `RM(score-detail-01)` geschrieben. Sie erlauben eine konkrete Zuordnung; ein GitHub-Commit beweist nur Code-Aktivität, nicht erfolgreiche Demo-/Gerätetests.
- Im Score-Bereich der Online-Roadmap lassen sich Web-Demo, iPhone & Watch, Tests, Beta, weitere Sportarten und Plattform getrennt filtern. Die 38 Score-Einträge enthalten die späteren Sportarten Padel, Pickleball, Beach Tennis und Tischtennis.
- Der tägliche zusätzliche ChatGPT-Abgleich prüft, soweit verbunden, auch Google Drive und dokumentierte Entwicklungstests. Unklare Änderungen bleiben Vorschläge. Die auf dem Webserver liegenden Benutzerkonten, Einladungen, Kommentare und manuelle Statusanpassungen werden nicht ersetzt.
- **Live-Veröffentlichung bleibt manuell:** https://github.com/tennis-schiri/tennis-schiri-app/actions/workflows/roadmap-subdomain.yml

## Einträge löschen und wiederherstellen

Die Projektleitung kann einzelne Roadmap-Themen in der Detailansicht über **Eintrag löschen** nach einer Bestätigung in den **Papierkorb** verschieben. Gelöschte Punkte sind für andere Benutzer unsichtbar, bleiben einschließlich Kommentaren aber im privaten `state.json` erhalten. Die Projektleitung kann sie über den Papierkorb wiederherstellen. Gelöschte IDs werden in `deletedItemIds` gesichert und bei jeder Seed-Synchronisierung berücksichtigt, damit ein Upload sie nicht unbeabsichtigt erneut anlegt. Gäste und eingeladene Nutzer dürfen keine Einträge löschen.

Die bereits doppelt vorhandene Score-Tischtennis-Detailaufgabe `score-detail-21` wurde mit dem ursprünglichen Thema `score-tabletennis` zusammengeführt. Die alte ID steht als `retiredIds` im Roadmap-Seed und wird beim Merge auch in vorhandenen Serverdaten ausgeblendet, ohne alte Kommentare im privaten Speicher zu löschen. Eine stillgelegte offizielle Dublette kann nicht über den Nutzer-Papierkorb wiederhergestellt werden.

Die neue Lösch-/Wiederherstellungslogik wird vor dem manuellen Upload mit `tests/roadmap-portal-delete.php` auf der CI-Laufzeit geprüft.

## Entwicklung nach Bereichen für alle Projekte

Das Board bietet jetzt dieselbe Bereichsübersicht für alle sechs Arbeitsstränge:
- **Tournament:** Turnierformate, Turnierbetrieb, Live & Anzeige, Produkt & Bedienung, Plattform & Zugang, Tests & Qualität.
- **Score:** Web-Demo, iPhone & Apple Watch, Tests & Qualität, Beta & Veröffentlichung, weitere Sportarten, Plattform & Schnittstellen.
- **Umpire:** Bedienkonzept, Scorecard & Zählung, Regeln & Zeitkontrollen, Anzeigen & Scoreboards, Schnittstellen.
- **Business:** Angebot & Zielgruppen, Plattform & Buchungen, Pilotpartner & Tests.
- **Übergreifend:** Daten & Matchmodell, Konten & Sicherheit, Sprachen & Standards, Integrationen.

Der Filter **Alle Projekte** zeigt die sechs Produktbereiche mit der Anzahl der Roadmap-Themen an. Nach Auswahl eines Produktes erscheinen dessen einzelne Entwicklungsbereiche als filterbare Kacheln; der Kanban-Status wird davon unabhängig geführt. Die vorhandenen Tournament-Fachkategorien werden direkt abgebildet, für die übrigen Produkte liegt die Zuordnung im offiziellen Seed-Feld `workstream`. Neue Ideen ohne explizite Zuordnung erscheinen unter **Weitere Themen** und können von der Projektleitung im Bearbeitungsdialog kategorisiert werden. Die geschützte Server-Datenbank (Konten, Einladungen, Kommentare, Statusbearbeitungen und Papierkorb) bleibt erhalten.

Tests: `node --test roadmap-site/product-sections.test.mjs` ist sowohl in der manuellen Subdomain-Auslieferung als auch im unabhängigen Code-Prüfworkflow aktiviert. Ein Deployment erfolgt weiterhin ausschließlich manuell.

## Unabhängige Wer-muss-Mini-Apps – eigenes Branding

Die Roadmap enthält nun **16 Aufgaben** für die unabhängige Mini-App-Werkstatt. Für jede der sechs Apps werden **Browser-Prototyp** und **native iPhone-/Android-App** getrennt betrachtet, ohne einen Browser-Prototyp als Store-App zu bezeichnen:

1. Wer muss?! (Flutter-Grundgerüst in Entwicklung)
2. Punktlandung!
3. Fingerchaos
4. Nicht kleckern!
5. Nur noch einmal!
6. Völlig daneben!

Hinzu kommen gemeinsame Browser-Werkstatt, DE/EN, unverbindliche Preis-/Bundleidee (Einzelpreis 1,99 €, Bundle 7,99 €) und der getrennte App-Ideenpool. Die Idee „TENNILO Umpire“ aus dem Pool bleibt ausschließlich im bestehenden TENNILO-Bereich, nicht als Dublette in den Mini-Apps.

**Quellen:**
- https://docs.google.com/document/d/1NY3IQP2YhwsWlteDGy4c7LjiNTNsY8Tjkx4TNWb6H1E/edit
- https://docs.google.com/document/d/1DL2-1gqF3syUkLWOqrCJ4p6_3H4E1MeSH3GFGXQMZPw/edit
- https://github.com/tennis-schiri/wer-muss-app

Die Roadmap benutzt die **freigegebenen Original-Icons WM04b, PL05, FC05, NK05, NE05 und VD05** aus dem Wer-muss-Repository. Der manuelle Roadmap-Workflow checkt das **öffentliche** Repository separat aus und übernimmt das Logo WM04b-SVG sowie die fünf WebP-Icons. Die Farben stammen aus der Wer-muss-Designfamilie: Nachtblau #111224, Zitronengelb #f5f36d, Lavendel #b6a5ff, Mint #71e6c8, Koralle #ff9288, Eisblau #85b9ff.

Die tatsächliche veröffentlichte Browser-Demo-Ziel-URL ist **nicht durch die GitHub-Quelldateien verifiziert**. Deshalb verlinkt die Roadmap-Startseite zunächst auf das GitHub-Demo-Verzeichnis und behauptet keinen erfolgreichen Website-Upload. Manuelle Wer-muss-Uploads laufen weiterhin separat über https://github.com/tennis-schiri/wer-muss-app/actions/workflows/deploy-test.yml.

Die Projekt-Übersicht zeigt unter `Alle Projekte` auch **Wer muss?! & Co.** mit acht farbigen Themenbereichen; App-Karten und Listen erhalten die zum jeweiligen Original-Icon passende Akzentfarbe. Die Editier-, Kommentar- und Löschfunktion samt serverseitiger Authentifizierung bleibt unverändert. Die gemeinsame Roadmap kann nun maximal 250 offizielle Seeds enthalten (bisher 100), damit weitere App-Ideen hinzukommen können, ohne bestehende Einträge zu entfernen.

**Täglicher GitHub-Abgleich:** Der Workflow `roadmap-site/daily-review.mjs` bezieht künftig auch `tennis-schiri/wer-muss-app` ein. Er protokolliert nur beobachtbare Codeänderungen und führt keine automatische Statusfreigabe und **keinen FTP-Live-Upload** durch. Die Roadmap bleibt nur über den ausdrücklich manuellen Upload auf der Subdomain veröffentlichbar.
