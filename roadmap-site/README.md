# TENNILO – gemeinsame Roadmap auf roadmap.tennilo.de

Eigenständiges Roadmap-Portal mit **persönlichem Login statt ALL-INKL-Verzeichnisschutz**, für TENNILO Tournament, Score, Umpire, Business und Plattformthemen.

## Bedienkonzept

1. `https://roadmap.tennilo.de` zeigt das TENNILO-Login: **Benutzername + Passwort** (ohne Browser-Verzeichnisdialog).
2. Nach Anmeldung: produktübergreifendes Roadmap-Board mit 50 initialen Themen, Suche, Kanban-/Listenansicht, Prioritäten, Meilensteinen, Kommentaren und Demo-Links.
3. `strategie.php` zeigt alle 16 Kapitel der Gesamtplanung – **nur mit gültiger Sitzung**; Gäste werden auf das Login weitergeleitet.
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
- kombiniert 33 bisherige Tournament-Themen und 17 Produkt-/Plattform-Ergänzungen;
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
