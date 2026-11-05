# TENNILO – Änderungsverlauf (Changelog)

**Stand:** 2026-11-05  
**Produktname:** TENNILO (Arbeitstitel) · frühere UI-Bezeichnung „Tennis-Schiri Turniermanager“

In diesem Dokument bedeutet **„implementiert“**: Änderung liegt im GitHub-Repository vor. Das ist **kein** Nachweis, dass sie bereits auf `app.tennis-schiri.de` veröffentlicht oder auf allen Geräten getestet wurde. Veröffentlichung und Tests gesondert im [Projektstatus](PROJEKTSTATUS.md) vermerken.

## [0.3.0] – normale Schleifchenturnier-Vorrunden

**Im GitHub-Code implementiert. Live-Veröffentlichung und GitHub-Actions-Testlauf noch nicht bestätigt.**

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
- Ein grüner GitHub-Actions-Lauf für diesen Stand ist noch nicht bestätigt.
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
