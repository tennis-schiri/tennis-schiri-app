# TENNILO – gemeinsame Roadmap und Ideensammlung

**Stand:** 2026-11-06 · **GitHub-Version:** v0.8.4, noch nicht veröffentlicht · **Live bestätigt:** v0.8.0.

## Ziel und Oberfläche

Unter `https://app.tennis-schiri.de/roadmap.html` erhalten die Projektleitung und ausgewählte Mitwirkende ein übersichtliches Entwicklungsboard. TENNILO verlinkt die Seite direkt auf der Startseite.

**Darstellung:** fünf Statusspalten mit Karten, Zahl der Themen und Kommentaren, Prioritäten, Meilenstein, nächstem Schritt, Suche, Bereichs- und Statusfiltern. Alternativ kompakte Listenansicht. Auf Smartphone werden die Spalten untereinander angezeigt.

Statusbedeutung:
- **Ideensammlung**: Vorschlag, noch nicht zugesagt.
- **Geplant**: prinzipiell für die nächsten Schritte vorgesehen.
- **In Arbeit**: wird entwickelt.
- **Code fertig**: im GitHub-Code umgesetzt, noch nicht erfolgreich auf der Testseite veröffentlicht.
- **Auf Testseite**: manuell über FTPS veröffentlichte, weiter zu testende Funktion; **nicht** gleichbedeutend mit allgemeiner Marktreife.

Die anfänglichen 18 Einträge in `site/roadmap-seed.json` beruhen auf `PROJEKTSTATUS.md` und bereits besprochenen Ideen. Keine erfundenen Veröffentlichungszusagen. Einmal auf dem Server gespeicherte Änderungen der Projektleitung werden durch spätere GitHub-Uploads nicht überschrieben; neu in der Seed-Datei hinzugefügte Einträge werden ergänzt. Die Roadmap ist **nicht automatisch** mit GitHub-Issues/Commits synchronisiert.

## Berechtigungen

Der bestehende HTTP-Basic-Passwortschutz der **gesamten Testseite** bleibt die erste Zugangsschranke. Die Roadmap erfordert eine geprüfte Apache-`AUTH_TYPE=Basic`-Identität und HTTPS. Die Roadmap-API liefert bei fehlendem Server-Passwortschutz keine gespeicherten Beiträge aus.

**Lesen:** Alle Personen, denen der bestehende Testseiten-Zugang eingeräumt wurde. Persönliche Roadmap-Codes **allein** umgehen den Testseiten-Passwortschutz **nicht**.

**Kommentieren und Ideen vorschlagen:** Nur nach Anmeldung mit zusätzlichem persönlichem, widerrufbarem Einladungscode. Der Code ist 192 Bit stark, wird nur einmal angezeigt und ausschließlich als SHA-256-Hash gespeichert. Kommentare und Ideen werden unter der vom Admin vergebenen Bezeichnung angezeigt. Keine E-Mail-Adresse nötig.

**Projektleitung:** Ein einmalig erzeugter Projektleitungs-Code erlaubt zusätzlich Status/Priorität/Details zu bearbeiten, Kommentare zu entfernen, Codes für `commenter` oder `viewer` zu erzeugen und zu widerrufen sowie den eigenen Code zu ersetzen.

**Wichtige Ersteinrichtung:** Solange noch kein Projektleitungs-Code existiert, kann **die erste Person mit dem Passwort der Testseite** die Administration übernehmen. Deshalb die Roadmap nach Veröffentlichung **zuerst selbst** öffnen, Einrichtung abschließen, Code sicher aufbewahren und **erst danach** andere Personen einladen. Wird der Code verloren und ist keine bestehende Admin-Sitzung mehr verfügbar, ist zur Wiederherstellung ein manueller Eingriff in den privaten Server-Datensatz nötig. Kein Klartext-Code in GitHub, Chats oder Screenshots.

**Serverseitige Sicherungen:** rollenbasierte Autorisierung bei jeder Schreibaktion und jeder Sitzung; widerrufene Codes werden sofort ungültig; HTTPS, SameSite-Strict/HttpOnly/Secure-Sitzungscookie, CSRF-Token, exakte Same-Origin-Prüfung, kein CORS, Eingabelimits, HTML-Escaping, kurze Schreibsperre und atomisches Speichern unter Dateisperre.

## Daten und Haltbarkeit (vor externen Einladungen beachten)

Neue Kommentare, Ideen, Rollen und geänderte Statuswerte sind **gemeinsame Serverdaten**, nicht Browser-`localStorage` und nicht GitHub-Commits.

Die Datei `site/roadmap-api.php` speichert eine JSON-Datenbank außerhalb des öffentlichen App-Webverzeichnisses. Der Standard-Speicherort liegt derzeit unter einem privaten, mit Modus `0700` angelegten Ordner von `sys_get_temp_dir()`. **Dieser Speicher ist nur für den ersten Test geeignet:** Ein Hosting-Betreiber kann temporäre Verzeichnisse löschen; Kommentare und Zugangscodes könnten dabei verloren gehen. Die Oberfläche zeigt solange einen Warnhinweis.

**Vor verlässlichem Betrieb mit echten Mitwirkenden:** In der Serverumgebung `TENNILO_ROADMAP_STORAGE_DIR` auf ein dauerhaft beschreibbares, **nicht öffentlich erreichbares absolutes Verzeichnis außerhalb aller Webroots** setzen. Keine Zugangscodes oder Pfade mit privaten Identitäten in GitHub committen. Falls bereits Testdaten existieren, zuvor die private `state.json` in dieses Verzeichnis übernehmen (mit Rechten `0600` für die Datei, `0700` für den Ordner), **danach** die Variable aktivieren. Die API verweigert Speicherplätze innerhalb des aktuellen App-Webroots. Der Admin kann eine datenschutzfreundliche JSON-Sicherung der Einträge und Kommentare herunterladen; diese enthält bewusst **keine** Anmelde-Hashes. Ein Wiederherstellungsdialog ist noch nicht implementiert.

**Datenschutz:** Kommentare können Personenbezeichnungen enthalten. Nur ausgewählte Personen einladen, Regeln zur Nutzung/Schutz der Daten prüfen und keine besonders sensiblen Inhalte eingeben. Vor einer allgemein erreichbaren Produktivseite sind Hosting-/Zugangskonzept und Aufbewahrung zu klären.

## Test- und Veröffentlichungsgrenze

- Dateien: `site/roadmap.html`, `site/assets/roadmap.js`, `site/assets/roadmap.css`, `site/roadmap-api.php`, `site/roadmap-lib.php`, `site/roadmap-seed.json`.
- Tests: `tests/roadmap-ui.test.mjs` und `tests/roadmap.php`.
- PHP-Syntax und Modelldatentests sind in Prüf- und **manuellen** Veröffentlichungsworkflow eingebunden.
- FTPS-Whitelist: **34 statt 28 Dateien**. Bestehender Passwortschutz, WordPress, `.htaccess`, Backend-Konto-API und Turnierdaten bleiben unangetastet.
- Die **volle CI-Prüfung** des GitHub-Standes und eine tatsächliche ALL-INKL-/Browser-/Zweitgeräte-Prüfung müssen vor einer Aussage über den Live-Erfolg bestätigt werden.
- **Kein Upload durch GitHub-Commits**. Nur `workflow_dispatch` startet die bestehende FTPS-Veröffentlichung.

## Mögliche Erweiterungen

- E-Mail-Einladungen und eigenständiger Roadmap-Lesezugang, ohne Passwort der gesamten Test-App zu teilen (benötigt separate Authentifizierung / Hosting-Konfiguration).
- Echte dauerhafte Datenbank, automatische Sicherungen und revisionssichere Ereignisse.
- GitHub-Issue-Synchronisierung für bereits freigegebene Entwicklungsvorhaben.
- Abstimmung/„Gefällt mir“, Anhänge, Benachrichtigungen und Moderatorfreigabe.
