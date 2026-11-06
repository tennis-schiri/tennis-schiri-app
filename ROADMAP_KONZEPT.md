# TENNILO – gemeinsame Roadmap und Ideensammlung

**Stand:** 2026-11-06 · **GitHub-Arbeitsstand:** v0.8.7 (persönliche Roadmap-Konten, noch nicht veröffentlicht) · **Testseiten-App:** v0.8.4 · **Roadmap-Inhalt:** 27 Themen, zuletzt unabhängig aktualisiert.

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

## Ausführliche Detailansicht v0.8.5 (in GitHub)

**Roadmap-Detailausbau v0.8.5 (noch nicht veröffentlicht):** In GitHub wurden alle 18 bestehenden Einträge um Ziel und Nutzen, Funktionsumfang, Umsetzungsstand, offene Punkte und klare Fertig-Kriterien ergänzt. Die Übersicht bleibt kurz; die Details sind nur im geöffneten Eintrag sichtbar und von der Projektleitung bearbeitbar. Altbestand wird ohne Überschreiben von Kommentaren, Rollen oder redaktionellen Statusänderungen ergänzt. [CI 42192449800](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42192449800): **245/245 Node-Tests** plus PHP- und MariaDB-Prüfungen erfolgreich. Die letzte Testseiten-Veröffentlichung bleibt **v0.8.4**. Der neue Detailausbau wurde noch nicht hochgeladen.

Die 18 bestehenden Themen besitzen fünf eigenständige Detailfelder. Neue Nutzerideen können ohne sie erstellt werden und die Projektleitung ergänzt sie später. Bereits bestehende Feldwerte – auch bewusst leere – bleiben beim Seed-Merge unverändert. Einträge ohne ausformulierte Details zeigen im Detailfenster einen neutralen Hinweis. Die Übersicht zeigt weiter nur Titel, Kurzbeschreibung, Priorität und Meilenstein.

**Roadmap aktualisiert und veröffentlicht (2026-11-06):** [GitHub-Actions-Roadmap-Upload 42198172057](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42198172057) erfolgreich: **259/259 Node-Tests**, PHP-Prüfung und **6/6 Roadmap-Dateien** per FTPS übertragen. Das Board umfasst **26 Themen**, darunter neue ausführliche Planung der vier Zählweisen Zeit, Punkte, Games und Sätze mit Tiebreak-/FAST4-/No-Ad-Unterformen. Diese erweiterten Game- und Satz-Zählweisen sind **geplant**, nicht bereits in der App verfügbar. Der separate Upload hat **keinen App-Code, kein Benutzerkontobackend und keine .htaccess** übertragen. Die zuletzt vollständig bestätigte App-Version bleibt **v0.8.4**; v0.8.6 ist nur in GitHub. Tests auf echtem Browser/Hosting sowie ein dauerhaft privater Roadmap-Speicher stehen weiterhin aus.

## Persönliche Benutzerkonten (v0.8.7, noch nicht hochgeladen)

**Roadmap-Nutzerverwaltung v0.8.7 (GitHub, noch nicht veröffentlicht):** Die umständlichen Zugangscodes werden durch persönliche Konten mit Benutzernamen und Passwort ersetzt. Die Projektleitung erstellt einmalige, sieben Tage gültige Einladungslinks; eingeladene Nutzer vergeben ihre Zugangsdaten selbst, können sie später ändern und werden in der Nutzerverwaltung als aktiv oder noch eingeladen angezeigt. Rollen (nur lesen/kommentieren) können geändert und Zugänge sofort gesperrt werden. Alte Admin- und Einladungscodes bleiben für eine **einmalige Migration** nutzbar, ohne Kommentare oder Status zu verlieren. Passwörter werden nur über PHP `password_hash` gespeichert, Einladungs-Tokens nur als Hash; bestehender Testseiten-Passwortschutz bleibt erhalten. Kein automatischer E-Mail-Versand, noch kein produktiver TENNILO-Account. **Release-Schutz:** Ein GitHub-Push mit geänderten Roadmap-Inhalten überträgt jetzt nur `site/roadmap-seed.json`; PHP-Authentifizierung, JavaScript und Styles dürfen ausschließlich über den ausdrücklich manuell gestarteten Roadmap-Workflow veröffentlicht werden. **Vor dem Release:** privaten, dauerhaften Server-Speicher einrichten und testen; bestehende Admin-Sitzung/Code sichern und dann umstellen. Die Roadmap-Idee `roadmap-accounts` ist als **Code fertig, nicht online** markiert.

**Bedienablauf:** Projektleitung meldet sich an bzw. wandelt den bestehenden Admin-Code über „Benutzerkonto einrichten“ um. Unter „Nutzer verwalten“ Anzeigename/Rolle wählen, Einladungslink einmalig kopieren und privat teilen. Einladungslink enthält den Registrierungstoken nur im URL-Fragment und entfernt ihn nach Öffnen aus der Adresszeile. Nach Registrierung sind Benutzername/Passwort ausreichend; unter „Mein Konto“ Passwort ändern. Gesperrte Konten verlieren sofort ihre Zugriffsrechte. Alt-Zugänge können in der Anmeldung einmalig den bisherigen Code eingeben und dann ein Konto anlegen.

**Wichtige Grenzen:** Keine Anmeldung ohne den weiterhin vorhandenen übergeordneten Passwortschutz der Testseite. Keine selbsttätige E-Mail-Einladung, kein E-Mail-basierter Passwort-Reset. Der reguläre Nutzer kann sein Passwort ändern, solange er angemeldet ist; bei verlorenen Passwörtern muss die Projektleitung den Zugang neu einrichten. Das ist bewusst getrennt vom zukünftigen Vereins-/Kunden-Backend. Mehrgeräte-Browser- und Sicherheitspraxistests auf dem Hosting stehen noch aus.

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
- Tests: `tests/roadmap-ui.test.mjs`, `tests/roadmap.php` und `tests/roadmap-http.test.mjs` (PHP-HTTP-Testserver mit simulierter Apache-Authentifizierung, nicht öffentlich deployt). Der HTTP-Test prüft Bootstrap, Sessions, CSRF-/Origin-Ablehnung, Einladungen, Kommentare, Statusänderungen, Widerruf und private Hash-Speicherung.
- PHP-Syntax und Modelldatentests sind in Prüf- und **manuellen** Veröffentlichungsworkflow eingebunden.
- FTPS-Whitelist: **34 statt 28 Dateien**. Bestehender Passwortschutz, WordPress, `.htaccess`, Backend-Konto-API und Turnierdaten bleiben unangetastet.
- **CI bestätigt:** GitHub-Prüflauf [42188294342](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42188294342) vom 2026-11-06: **244/244 Node-Tests**, PHP-Syntax, Roadmap-Fachtests und simulierte PHP-HTTP-Integration bestanden. Die tatsächliche ALL-INKL-/Browser-/Zweitgeräte-Prüfung steht weiter aus.
- **Veröffentlichung:** [GitHub-Actions-Lauf 42189703936](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42189703936) erfolgreich (244/244 Node-Tests, PHP-Prüfung, 34/34 Dateien). Der für die ausdrückliche Freigabe temporär ergänzte, einmalige Release-Auslöser ist wieder entfernt. Die bestehende FTPS-Veröffentlichung arbeitet danach wieder ausschließlich per `workflow_dispatch`.

**Nächste Schritte nach dem Upload:** Projektleitungs-Code als erster Testseitenbenutzer erstellen und externen Personen bis dahin keinen Testseitenzugang geben; für dauerhaft verlässliche Daten ein persistentes privates Verzeichnis außerhalb der Webroots konfigurieren; alle Benutzerrollen, Kommentarfunktionen, widerrufenen Einladungen und Reloads praktisch prüfen. Die vorab angelegte Karte der Roadmap selbst hat noch den Seed-Status „In Arbeit“ und soll bei der ersten Moderation auf „Auf Testseite“ geändert werden.

**Neuer GitHub-Stand v0.8.6 (noch nicht als App veröffentlicht, 2026-11-06):** Die neue Wahl **Matches auf Zeit / Matches auf Punkte** ist für Schleifchen und feste Doppel einschließlich Ergebniserfassung und Turnierberater implementiert. Im Punktmodus werden 1–99 Punkte, optional zwei Punkte Vorsprung, geprüft und der Sieger aus den Zahlen ermittelt; beim One Point Cup bleibt es genau ein Punkt. Punktspiele haben nur eine geschätzte Dauer, daher ist eine Endzeit keine Zusage. Aus der verifizierten Drive-Bibliothek wurden sechs zusätzliche Formatideen mit ihren Quellen ins offizielle Roadmap-Board aufgenommen (nun 25 Themen). Das separate GitHub-Actions-Roadmap-Sync lädt ausschließlich die sechs geschützten Roadmap-Dateien hoch, wenn deren Inhalte angepasst werden, nicht die App oder das Backend. Die Roadmap-Aktualisierung bleibt Teil **jedes** Entwicklungsschritts; GitHub-Code und Roadmap sollen denselben Status beschreiben. [CI 42196961233](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42196961233) erfolgreich: **259/259 Node-Tests** plus PHP-/MariaDB-Prüfung. Die letzte bestätigte komplette App-Veröffentlichung bleibt v0.8.4; Roadmap-only-Sync [42195744267](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42195744267) erfolgreich. Echte Browser-Praxistests und dauerhafter privater Roadmap-Speicher noch offen.

**Arbeitsprozess:** Wenn hier ein neues Feature entwickelt, getestet, verschoben oder freigegeben wird, sind offizielles Roadmap-Seed und GitHub-Projektdokumentation im selben Arbeitsgang zu aktualisieren. Der isolierte Sync überträgt nur Roadmap-Assets und Daten; manuell angepasste Serverstatus und Kommentare bleiben erhalten. Das ist keine direkte Live-Synchronisierung mit Chatnachrichten oder Google Drive.

## Mögliche Erweiterungen

- E-Mail-Einladungen und eigenständiger Roadmap-Lesezugang, ohne Passwort der gesamten Test-App zu teilen (benötigt separate Authentifizierung / Hosting-Konfiguration).
- Echte dauerhafte Datenbank, automatische Sicherungen und revisionssichere Ereignisse.
- GitHub-Issue-Synchronisierung für bereits freigegebene Entwicklungsvorhaben.
- Abstimmung/„Gefällt mir“, Anhänge, Benachrichtigungen und Moderatorfreigabe.
