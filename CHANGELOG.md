# TENNILO – Änderungsverlauf (Changelog)

**Stand:** 2026-11-05  
**Produktname:** TENNILO (Arbeitstitel) · frühere UI-Bezeichnung „Tennis-Schiri Turniermanager“

In diesem Dokument bedeutet **„implementiert“**: Änderung liegt im GitHub-Repository vor. Das ist **kein** Nachweis, dass sie bereits auf `app.tennis-schiri.de` veröffentlicht oder auf allen Geräten getestet wurde. Veröffentlichung und Tests gesondert im [Projektstatus](PROJEKTSTATUS.md) vermerken.

## [0.3.3] – Auffüllrunde nach Schleifchen-V7

**Im GitHub-Code implementiert und simuliert getestet. Noch keine bestätigte Veröffentlichung dieser Version oder echter Browser-Test.**

### Neu
- Die letzte Auffüllrunde wird nach vollständiger Ergebnis-Erfassung aller normalen Runden separat ausgelost.
- Auffüllspieler werden aus Teilnehmern ihrer jeweiligen Stärkegruppe ausgewählt, die ihre normale Spielquote erfüllt und **höchstens 1 Schleifchen** gewonnen haben. Bereits regulär für die letzte Runde vorgesehene Teilnehmer sind ausgeschlossen.
- Bestehende Partnerbegegnungen werden bei der Paarung stärker gewichtet als wiederholte Gegner. Jede Mannschaft besteht weiterhin aus 1 starkem und 1 schwächerem Spieler; kein Teilnehmer darf in der letzten Runde doppelt vorkommen.
- Gelb markierte **Auffüller · ohne Wertung**: Zusatzeinsätze dieser Spieler verändern weder ihre gespielten Wertungsspiele noch ihre Schleifchen oder Niederlagen. Andere Spieler bekommen das fehlende reguläre Wertungsspiel.
- Ergebnisse können auch in der Auffüllrunde eingegeben werden; Anzeigen funktionieren wie gewohnt mit Sieger-Markierung und kompakter Spielstandansicht.
- Eine bereits ausgeloste Auffüllrunde sperrt Änderungen an normalen Ergebnissen. Über „Auffüllrunde zurücknehmen“ kann die letzte Runde inklusive Zusatz-Ergebnissen gelöscht werden; **alle normalen Runden und Ergebnisse bleiben erhalten**.
- Sicherheitsprüfungen für veränderte normale Ergebnisse, nicht zulässige Füller, falsche Gruppen, doppelte Platz-/Spielerbelegung und unvollständige Spielpläne.
- Neues Modul `site/assets/special.js`; manueller FTPS-Workflow überträgt jetzt **sieben** ausdrücklich festgelegte App-Dateien.
- Neue Testdateien `tests/special.test.mjs` (12 Regeltests) und `tests/special-ui.test.mjs` (Bedienablauf).
- Startseite enthält nun „Auffüllrunde testen“: Musterturnier mit 5 starken und 5 schwächeren Spielern, 3 Wertungsspielen und 3 Plätzen.

### Prüfung und Grenzen
- **39 Logiktests + 2 simulierte UI-Tests erfolgreich**; darunter Regressionstests für die unveränderte kompakte Ergebnisanzeige.
- GitHub-Actions-Testlauf für die Version 0.3.3 und echter Browser-Funktionstest stehen noch aus.
- **Noch nicht implementiert:** Endrunden-Qualifikation, Halbfinal-/Finalspiele, Turnierabschluss und Mehrgeräte-Synchronisierung. Keine Freigabe für produktive Turniere.

## [0.3.2] – kompakte Ergebnisanzeige und Gewinner-Markierung

**Stand 2026-11-05:** Am 2026-11-05 per manuellem [GitHub-Actions-Lauf 42003891468](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42003891468) erfolgreich getestet und via FTPS hochgeladen. Der Nutzer bestätigte anschließend die kompakte Ergebnisanzeige.

### Geändert
- Sobald ein Ergebnis gespeichert ist, verschwindet die Ergebnis-Eingabezeile der betreffenden Begegnung.
- Die Game-Zahlen werden direkt zwischen den beiden Teams angezeigt, falls vorhanden. Wird nur der Sieger erfasst, erscheint ein kompaktes Sieg-Symbol statt eines erfundenen Spielstands.
- Siegerteam ist durch eine hervorgehobene Fläche und eine deutlich sichtbare „Sieger“-Markierung gekennzeichnet.
- Über **„Ergebnis ändern“** lassen sich die vorausgefüllten Eingabefelder jederzeit wieder öffnen; **„Abbrechen“** verwirft ungespeicherte Änderungen.
- Nach erneuter Speicherung, Neuladen oder Wiederöffnen bleibt die kompakte Ergebnisanzeige erhalten. Es gibt keine Änderung am Ergebnis-Datenmodell.
- Version und Browser-Cache-Parameter auf 0.3.2 aktualisiert.

### Tests
- Bereits vorhandene 27 Logiktests und ein neuer UI-Regressionstest (`tests/result-ui.test.mjs`) für Speichern, automatische Kompaktansicht, Gewinner-Markierung, Bearbeiten, Abbrechen und Wiederöffnen.
- Der bestehende manuelle Workflow `node --test tests/*.test.mjs` berücksichtigt die neue Testdatei automatisch. Er lädt weiterhin ausschließlich die sechs App-Dateien hoch, ohne FTP-Zugangsdaten oder Passwortschutz zu verändern.

## [0.3.1] – Ergebnisse und Schleifchen-Zwischenstand

**Stand 2026-11-05:** Per manuellem [GitHub-Actions-Lauf 41991275917](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/41991275917) erfolgreich getestet und per FTPS hochgeladen. Anschließend Rückmeldung des Nutzers zur Ergebnisanzeige; ein vollständiger Browser-End-to-End-Test ist noch nicht bestätigt.

### Neu
- Pro normaler Vorrundenbegegnung Siegerteam ausdrücklich erfassen; gewonnene Games pro Team sind optional (jeweils 0–99). Bei ungleichen Games darf der Gewinner nicht widersprechen; bei gleichen Games ist eine gesonderte Siegerentscheidung erforderlich.
- Jedes Mitglied des Siegerteams erhält genau ein Schleifchen; Verlierer werden gezählt. Gespielte Begegnungen und aktuelle Siegquote werden pro Person angezeigt.
- Lokale Zwischenstand-Tabelle mit Sortierung nach Schleifchen, gespielten Matches und Name, analog zur bisherigen Google-Tabelle.
- Ergebnisse bearbeiten, zurücksetzen, browserseitig speichern und über die bestehende JSON-Sicherung austauschen.
- Statusanzeige für vollständig erfasste reguläre Runden; erst dann wird die Zahl geeigneter Auffüllkandidaten (0 oder 1 Schleifchen, ohne die bereits für das letzte Match vorgesehenen regulären Spieler) ermittelt.
- Auslosungs-Reset warnt bei vorhandenen Ergebnissen vor Verlust aller Resultate.
- Neues Modul `site/assets/results.js` mit elf gezielten Tests in `tests/results.test.mjs`.
- Manueller GitHub-Actions-Workflow prüft künftig beide Testdateien (`tests/*.test.mjs`) und lädt sechs App-Dateien hoch.

### Tests, Kompatibilität und Grenzen
- Elf Ergebnistests und simulierter Browser-Bedienablauf (Eingabe, widersprüchliche Games, Rücksetzung, Wiederöffnen, JSON-Backup) erfolgreich.
- Alte Spielpläne ohne Ergebnisfelder bleiben kompatibel. Browser-Speicherschlüssel und Schema-Version 1 unverändert.
- Noch keine tatsächliche Auffüllrunde oder Endrunde, zentrale Datenbank oder Mehrgeräte-Livetabelle; weiterhin Testversion.

## Wartung · 2026-11-05 – GitHub-Actions-Umgebung

- Node-20-Warnung beseitigt: `actions/checkout` und `actions/setup-node` von v4 auf v7 angehoben (interner Action-Runtime Node 24).
- Beide Jobs zunächst auf `ubuntu-24.04` fixiert, um die laufende Migration von `ubuntu-latest` auf Ubuntu 26.04 nicht ungeprüft zu übernehmen.
- `persist-credentials: false` für den Checkout; keine Git-Zugangsdaten müssen für den reinen FTPS-Upload persistiert werden.
- Manueller Upload, Tests und FTP-Secrets unverändert; der Nutzer bestätigte nach einem erneuten Lauf, dass keine Warnungen mehr angezeigt wurden (Laufdetails nicht gesondert geprüft). Die für v0.3.1 später ergänzte Ergebnisdatei wird ebenfalls nur manuell veröffentlicht.

## [0.3.0] – normale Schleifchenturnier-Vorrunden

**Im GitHub-Code implementiert und per manuellem [Actions-Lauf 41986086093](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/41986086093) am 2026-11-05 erfolgreich getestet und via FTPS übertragen. Ein echter Browser-Funktionstest fehlt noch.**

### Neu
- Neuer Menüpunkt **Auslosung** mit Runden, Startzeiten, benannten Plätzen und Begegnungen.
- Eigenständiges JavaScript-Modul `site/assets/draw.js`; orientiert am V7-Schleifchenansatz der vorhandenen Google-Tabelle.
- Jedes Doppelteam besteht aus 1 Stark + 1 Schwächer; 3 oder 4 reguläre Wertungsspiele je anwesendem Spieler.
- Keine Mehrfachbelegung einer Person innerhalb derselben Runde; Teilnehmende und Plätze werden überprüft.
- Normale Runden werden gespeichert; eine Signatur erkennt spätere Änderungen der Stärkegruppen, Teilnehmeranwesenheit, Spielanzahl und Platzliste.
- Eine eventuell notwendige **Auffüllrunde** wird nur angekündigt – noch nicht ausgelost.
- Reproduzierbare Node-Tests unter `tests/draw.test.mjs`; der manuelle GitHub-Workflow führt sie vor dem Upload aus.
- Der Workflow überträgt ab dieser Version fünf App-Dateien, einschließlich der Auslosungslogik.

### Prüfstatus und Grenzen
- Szenarien mit geraden, ungeraden sowie ungleich großen Stärkegruppen wurden in simulierten Prüfungen getestet.
- Der GitHub-Actions-Lauf `41986086093` war grün und enthielt die Auslosungstests sowie den FTPS-Upload.
- Noch keine Ergebnis-/Schleifchenwertung, Auffüllrunde, Endrunde oder Livetabelle; daher **keine Freigabe für echte Turniere**.

## [0.2.3] – individuelle Platznamen

**Im Repository implementiert. Live-Veröffentlichung nicht bestätigt.**

### Neu
- Individuelle Platzbezeichnungen unter „Einstellungen → Platzbezeichnungen → Plätze benennen“.
- Standardnamen „Platz 1“, „Platz 2“, „Platz 3“ usw.
- Vorhandene interne Platznummern bleiben unabhängig vom Anzeigenamen bestehen.
- Eindeutigkeitsprüfung der Platznamen; Eingabe begrenzt auf 60 Zeichen.
- Anzeige der individuellen Namen in den Turniereinstellungen.
- JSON-Sicherung/Import enthält die neuen Platznamen.

### Kompatibilität
- Ältere Turniere ohne benannte Plätze werden mit den Standardnamen angezeigt.
- Die browserseitige Speicherkennung `tennis-schiri-tournaments-v1` und die Schema-Version 1 bleiben bestehen.
- Entfernte Plätze verlieren ihre zugehörigen Namen; verbleibende Platznamen bleiben erhalten.

## [0.2.2] – frei wählbare Platzanzahl

**Im Repository implementiert. Live-Veröffentlichung nicht bestätigt.**

### Geändert
- Feste Checkboxauswahl von maximal sieben Plätzen entfernt.
- Stattdessen Zahlenfeld für 1–1.000 Plätze (technische Grenze).
- Neue Turniere erzeugen fortlaufende Platznummern.
- Speichermodell auf höhere Platznummern angepasst.
- Größere Platzanzahlen werden in Übersichten kompakter dargestellt.
- Vorhandene Turniere und bisherige Platzeinstellungen werden beim Öffnen weiter unterstützt.

## [0.2.1] – Navigation und Startseite

**Im Repository implementiert. Live-Veröffentlichung nicht bestätigt.**

### Neu
- Startseite aus dem Turnier über Menüeintrag oder Logo erreichbar.
- Auf der Startseite werden bestehende Turniere aufgelistet.
- Bestehende Turniere können direkt wieder geöffnet werden.
- Wechsel zwischen Startseite und Turnier ohne absichtliches Löschen der Daten.

## [0.2.0] – erste bedienbare Turnierverwaltung

**Im Repository implementiert. Der Nutzer hat die App bedient und einen Navigationsmangel gemeldet; der genaue laufende Versionsstand wurde nicht zusätzlich geprüft.**

### Neu
- Turniere anlegen, bearbeiten, auswählen, löschen.
- Teilnehmer erfassen und bearbeiten; Gruppen Stark/Schwächer, Anwesenheit.
- Turnierdashboard, Einstellungsansicht, Beispielturnier.
- Browser-`localStorage` sowie Sicherung als JSON-Export und -Import.
- Mobile, responsive Gestaltung, passend zur ursprünglichen Startseite.
- Manueller FTPS-Deploy wurde für HTML/CSS/JS-Dateien erweitert.

### Grenzen
- Noch keine tatsächliche Auslosung, Ergebniserfassung, Live-Tabelle oder Datenbank.

## [0.1.0] – technische Grundlage

**Erste Startseite und GitHub-Deployment vom Nutzer als funktionierend bestätigt.**

### Neu
- Private GitHub-Codebasis.
- Eigene ALL-INKL-Subdomain `app.tennis-schiri.de` mit HTTPS und Verzeichnisschutz.
- Statische Design-/Projektstartseite mit drei geplanten Modulen.
- Manuell startbarer GitHub-Actions-Upload über FTPS.
- Kein automatisches Deployment bei jeder Codeänderung.
- Designkonzept mit Petrol, Orange und Limettengrün vom Nutzer positiv aufgenommen.

---

## So führen wir diesen Verlauf weiter

Bei einer neuen Version ergänzen:
1. **Versionsnummer** und **Datum der Änderung**.
2. **Neu / Geändert / Behoben** mit konkreten Funktionen und gegebenenfalls Migrationen.
3. **Teststand** (Syntax, Unit/Integration, manuell im Browser).
4. **Veröffentlichungsstand** mit Bestätigung und gegebenenfalls Workflow-Lauf.
5. **Offene Probleme** – keine behobenen Fehler behaupten, bevor sie geprüft sind.

Die Einträge bis 0.2.3 wurden am 2026-11-05 aus Code und bisherigem Entwicklungsverlauf rekonstruiert; die Überschriften stellen keine bestätigten Einzel-Veröffentlichungstermine dar.
