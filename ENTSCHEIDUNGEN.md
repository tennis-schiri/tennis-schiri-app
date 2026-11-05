# TENNILO – Entscheidungen und Anforderungen

**Stand:** 2026-11-05  
**Status:** Verbindliche Projektnotizen für die weitere Entwicklung. Neue Festlegungen mit Datum und Begründung ergänzen; nicht ohne Rücksprache bestehende Produktanforderungen ändern.

## Produkt und Marke

### E-001 · Arbeitstitel TENNILO
- **Entscheidung:** TENNILO ist der aktuelle **Arbeitstitel**, nicht die abschließend geschützte Marke.
- **Dachmarke:** Tennis-Schiri / Insta Tennis-Schiri.
- **Warum:** Moderner, flüssig klingender App-Name statt abgehackter Kombinationen aus Tennis-/Turnierwörtern.
- **Konsequenz:** Namensstrategie berücksichtigen, aber Domain/Marke und Instagram-Nutzung vor endgültiger Umbenennung rechtlich/praktisch prüfen. Der Nutzer hat Domainverfügbarkeit selbst recherchiert; das ist **keine** Bestätigung durch das Projekt.
- **Claim:** „Weniger Orga. Mehr Tennis.“

### E-002 · Produktumfang
- **Entscheidung:** Die App soll mehrere Turnierformate verwalten können, nicht nur Schleifchenturniere.
- **Reihenfolge:** 1. Schleifchenturnier, 2. Doppelturnier, 3. One Point Cup.
- **Warum:** Zuerst den bestehenden, datenmäßig fundierten Anwendungsfall fertigstellen; Architektur offen für Erweiterungen halten.

### E-003 · Design
- **Entscheidung:** Gewählten visuellen Stil beibehalten: dunkles Petrol, Orange, helles Limettengrün, markante Typografie, klare Karten und mobile Bedienbarkeit.
- **Warum:** Der Nutzer hat den Look der ersten Webseite ausdrücklich positiv beurteilt.
- **Konsequenz:** Neue Oberflächen an `site/assets/styles.css` orientieren, statt ohne Grund ein Re-Design einzuführen.

## Turnier- und Platzverwaltung

### E-004 · Turnier-Startseite und Navigation
- **Entscheidung:** Von jedem Turnier muss es einen klaren Weg zurück zur App-Startseite geben; vorhandene Turniere dort auflisten und wieder öffnen können.
- **Warum:** In der ersten bedienbaren Version fehlte die Rücknavigation.
- **Umsetzung:** Menüpunkt „Startseite“, klickbares Logo, Liste „Deine Turniere“.

### E-005 · Frei wählbare Platzanzahl
- **Entscheidung:** Zahl der Tennisplätze wird **als Zahl frei eingegeben**, nicht aus einer fixen Auswahl bis sieben gewählt.
- **Aktuelle technische Grenze:** 1 bis 1.000 zur Eingabe- und Datenvalidierung; dies ist keine produktseitig gewollte Grenze bei sieben.
- **Standard für neue Turniere:** 6 Plätze, fortlaufend nummerierte interne Kennungen.
- **Warum:** Die Zahl der verfügbaren Plätze ist je nach Turnier/Verein unterschiedlich.
- **Konsequenz:** Spätere Auslosung muss beliebige realistische Platzanzahlen und zu wenige/zu viele Spieler sinnvoll behandeln.

### E-006 · Individuell benennbare Plätze
- **Entscheidung:** Standardnamen lauten **„Platz 1“, „Platz 2“, „Platz 3“ …**.
- **Bedienung:** Nach dem Anlegen unter **Einstellungen → Platzbezeichnungen → Plätze benennen** Namen ändern.
- **Beispiele:** „Center Court“, „Halle links“, „Außenplatz A“.
- **Technik:** Interne Platznummern bleiben stabil; optionale Bezeichnungen liegen pro Turnier in `courtLabels`. Leere bzw. Standardwerte fallen auf „Platz N“ zurück. Platznamen müssen innerhalb eines Turniers eindeutig sein.
- **Kompatibilität:** Bereits gespeicherte Turniere ohne `courtLabels` verwenden automatisch Standardnamen; Import/Export sichert individuelle Namen. Wenn Plätze entfernt werden, werden dazugehörige nicht mehr benötigte Namen entfernt.
- **Warum:** Im Alltag stimmen Platznamen und numerische Plätze nicht immer überein.

### E-007 · Teilnehmer und Anwesenheit
- **Entscheidung:** Spieler lassen sich mit Namen, Gruppe **Stark/Schwächer** und Anwesenheitsstatus erfassen.
- **Warum:** Die Teilnehmerliste und tatsächlich anwesenden Spieler bilden die Grundlage für die spätere Auslosung.
- **Offen:** Wie die Auslosung mit ungleichen Stärkegruppen, Ausfällen, mehrfachen Begegnungen und Pausen exakt umgeht, muss aus der bestehenden Google-Tabelle übernommen und mit Beispielen getestet werden.

### E-008 · Turnierparameter
- **Aktuell in der UI:** Name, Datum, Startzeit, Spieldauer, Wechselzeit, Anzahl der Wertungsspiele, Platzanzahl.
- **Derzeitige Standardwerte:** 20 Minuten Spielzeit, 10 Minuten Wechselzeit, 4 Spiele pro Spieler, 6 Plätze. **Diese Werte sind Vorschläge, keine festen Regeln.**
- **Offen:** Abschließende Regeln und Sonderfälle des Turnierformats vor Umsetzung der Auslosung prüfen.

## Technik, Hosting und Betrieb

### E-009 · Eigener Hostingbereich
- **Entscheidung:** Web-App unter `app.tennis-schiri.de` auf ALL-INKL betreiben, unabhängig von der WordPress-Hauptseite `tennis-schiri.de`.
- **Sicherheit:** HTTPS/Let's Encrypt und ALL-INKL-Verzeichnisschutz für die Entwicklungsphase beibehalten.
- **Warum:** Eigene Umgebung ohne Eingriff in das WordPress-Projekt.

### E-010 · GitHub als zentrale Projektquelle
- **Entscheidung:** Privates Repository `tennis-schiri/tennis-schiri-app` auf `main`.
- **Dokumentation:** `README.md`, `PROJEKTSTATUS.md`, `ENTSCHEIDUNGEN.md`, `CHANGELOG.md`.
- **Warum:** Fortsetzung über viele Chats hinweg ohne erneute technische Bestandsaufnahme.
- **Regel:** Relevante Änderungen dokumentieren; kein Passwort, kein FTP-Kennwort und keine personenbezogenen Produktionsdaten im Repository.

### E-011 · Deployment nur nach bewusster Auslösung
- **Entscheidung:** GitHub-Actions-Workflow per `workflow_dispatch` manuell starten; GitHub-Commit allein veröffentlicht nichts.
- **Technik:** FTPS mit Repository-Secrets; eingeschränkter FTP-Nutzer; nur ausgewählte Dateien hochladen.
- **Sicherheitsregel:** `.htaccess`, HTTP-Passwortschutz, bestehende `index.htm` und WordPress-Dateien nicht unbeabsichtigt überschreiben oder löschen.
- **Grund:** Nutzer möchte Entwicklung kontrolliert direkt auf der geschützten Subdomain testen.

### E-012 · Aktuelles Frontend: statisch statt frühzeitig komplex
- **Tatsächliche Implementierung:** HTML, CSS, JavaScript-Module in `site/`.
- **Frühe Architekturidee:** React/PWA war als mögliche Richtung diskutiert; **nicht implementiert und nicht verbindlich festgelegt**.
- **Backend-Idee:** PHP + MySQL/MariaDB passend zu ALL-INKL. Erst nach Klärung von Datenmodell, Nutzern, Sicherheit und Backup-Strategie umsetzen.
- **Warum:** Kleine, testbare Schritte; keine unnötigen Hosting-Abhängigkeiten.

### E-013 · Temporäre Datenspeicherung
- **Entscheidung:** Bis zum Backend Browser-`localStorage`, mit Versionierung und JSON-Export/Import.
- **Konsequenz:** Nicht zwischen Geräten synchronisiert; Browserdaten können verloren gehen. Für Testzwecke gedacht, nicht für den produktiven Einsatz mit echten sensiblen Daten.
- **Nächste Architekturentscheidung:** Serverseitige Speicherung, Benutzer-/Vereinskonten, Datenschutz, Zugriffskontrolle, Backups.

## Arbeitsweise

### E-014 · Kleine, nachvollziehbare Schritte
- Nutzer bevorzugt schrittweises Vorgehen mit konkreten Testanweisungen und gegebenenfalls Screenshots.
- Anforderungen sollen umgesetzt und im Repository überprüft werden.
- Nicht behaupten, etwas sei online, nur weil es in GitHub gespeichert wurde.
- Nach jedem größeren Schritt Dokumentation aktualisieren, auf echte Tests und bekannte Einschränkungen hinweisen.

## Ideen, **noch keine Entscheidungen**

- Preisgestaltung, Lizenzmodell, Verkauf über tennis-schiri.de
- Eigene TENNILO-Domain als primäre App-Adresse
- React/PWA-Umstellung und Offline-Unterstützung
- Hostingarchitektur der endgültigen Benutzerkonten
- Turnierübergreifende Vorlagen und Vereinsverwaltung

**Neue Entscheidung ergänzen:** `E-015 · [Titel]` mit Datum, Anlass, Entscheidung, Begründung, technischen Auswirkungen und offenen Fragen. Änderungen an einer bestehenden Entscheidung ausdrücklich vermerken.

## E-015 · Schleifchen-Auslosung und Auffüllerprinzip (2026-11-05)

- **Fachliche Quelle:** Google-Sheet „Turniere Verein – Auslosung & Livetabelle“, Tab „Script“, Zelle A4. Maßgeblich ist der zuletzt definierte Schleifchen-V7-Ansatz (frühere Funktionsvarianten sind im Script ebenfalls vorhanden).
- **Technik:** Das eigenständige Modul `site/assets/draw.js` plant normale Vorrunden; Darstellung unter dem App-Menüpunkt „Auslosung“.
- **Teamregel:** Jede Doppelmannschaft umfasst 1 starke + 1 schwächere Person. Pro Runde darf niemand doppelt aufgestellt sein. Die Auslosung beachtet Anzahl und Bezeichnung der Plätze.
- **Wertung:** Laut Vorlage erhält jede regulär anwesende Person drei oder vier Wertungsspiele. Die normale Auslosung prüft passende individuelle Kontingente.
- **Auffüllrunde:** Bei nicht exakt passender Besetzung wird eine letzte Runde separat behandelt. Zusätzliche Auffüllspieler müssen aus den Personen mit 0 oder 1 Schleifchen nach den Normalrunden ausgewählt werden. Ihr zusätzliches Match wird ihnen nicht als Wertungsspiel oder Schleifchen angerechnet.
- **Stand v0.3.0:** Nur normale Vorrunden werden tatsächlich ausgelost; Auffüllrunde wird bei Bedarf erkannt, aber noch nicht final besetzt. Ergebniserfassung und Wertung fehlen noch.
- **Konsistenz:** Ein gespeicherter Plan wird gegen eine Signatur aus Teilnehmerkennungen, Anwesenheit, Stärkegruppen, Wertungsspielen und aktiven Plätzen geprüft. Ein veralteter Plan wird nicht als gültig angezeigt.
- **Qualität:** Wiederholbare Tests in `tests/draw.test.mjs`, vor jedem manuellen Upload per GitHub Actions. Ein erfolgreicher Live-Test ist gesondert zu bestätigen.
- **Offen:** Ergebnisfelder, Gewinnerwertung, Auswahl der Auffüller nach Ergebnissen, Endrunde, Livetabelle sowie umfassende Browser-End-to-End-Tests.

## E-016 · Drive als fachliche Ergänzung (2026-11-05)

- **Entscheidung:** Der bestehende Drive-Projektordner dient als Quelle für Turnierformate und als Ablage für lesbare TENNILO-Projektkonzepte.
- **Neu angelegt:** Unterordner „TENNILO – Dokumentation“ (https://drive.google.com/drive/folders/1w6WBQH0o5MEwnKn3ZuuN43HiHaxvMnBg) und ein Google-Doc-Projektwegweiser (https://docs.google.com/document/d/1d9Gx6AahC1RbEVFtavmo4Y8UAU7_R6EzmmiWQ5mlZr8/edit).
- **Vorhanden und unverändert:** „Turnierformate“ (https://drive.google.com/drive/folders/1aPuhuzKZvif5RnfXXVcJsGCkRL6wepfs) mit PDF-Regelbeschreibungen und Excel-Ergebnisvorlagen.
- **Abgrenzung:** GitHub bleibt verbindlich für Code, Produktentscheidungen, Versionen, Test- und Veröffentlichungsstatus. Drive dient für fachliche Originale, Recherche und Konzepte. Keine zweite unabhängig gepflegte Versionschronik.
- **Regel:** Vor neuen Formaten den relevanten PDF-/Excel-Inhalt und Sonderfälle genau prüfen. Die PDF-Formate ersetzen nicht automatisch das bestehende Schleifchenturnier-V7-Regelwerk.
- **Quellenindex:** [QUELLEN_TURNIERFORMATE.md](QUELLEN_TURNIERFORMATE.md).
