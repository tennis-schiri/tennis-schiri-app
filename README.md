# TENNILO – Tennis-Turniermanager

**TENNILO ist der aktuelle Arbeitstitel** für die browserbasierte Turnier-App von **Tennis-Schiri**. Die endgültige Marken-/Domainentscheidung steht noch aus. Die Benutzeroberfläche verwendet vorläufig weiterhin den Namen Tennis-Schiri Turniermanager.

**Aktueller GitHub-Code:** v0.3.1 · **Letzter bestätigter Upload:** v0.3.0 am 2026-11-05 (Run `41986086093`). Die neuen Ergebnisfunktionen aus v0.3.1 wurden noch **nicht** veröffentlicht.

## Einstieg und Projektdokumentation

Die GitHub-Dateien sind die verbindliche Arbeitsgrundlage, auch wenn ein Chat nicht mehr verfügbar ist:

| Datei | Zweck |
| --- | --- |
| [PROJEKTSTATUS.md](PROJEKTSTATUS.md) | Tatsächlicher Stand, offen/geplant, Hosting, Tests und nächste Aufgaben |
| [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md) | Produktanforderungen, begründete Entscheidungen und Randbedingungen |
| [CHANGELOG.md](CHANGELOG.md) | Änderungen pro Version, inklusive Veröffentlichungs-/Teststatus |
| [QUELLEN_TURNIERFORMATE.md](QUELLEN_TURNIERFORMATE.md) | Google-Drive-Turnierbibliothek, formatbezogene Referenzen und gemeinsamer Dokumentationsordner |
| [README.md](README.md) | Projektüberblick und technische Orientierung |

**Beim Start in einem neuen Chat:** Die drei Dateien oben sowie den aktuellen Code prüfen. Nicht automatisch annehmen, dass `main` bereits auf dem Webspace läuft.

## Google Drive als ergänzende Projektdokumentation

- [TENNILO – Dokumentation (Drive-Ordner)](https://drive.google.com/drive/folders/1w6WBQH0o5MEwnKn3ZuuN43HiHaxvMnBg)
- [TENNILO – Projektwegweiser (Google Doc)](https://docs.google.com/document/d/1d9Gx6AahC1RbEVFtavmo4Y8UAU7_R6EzmmiWQ5mlZr8/edit)
- [Vorhandene Bibliothek „Turnierformate“](https://drive.google.com/drive/folders/1aPuhuzKZvif5RnfXXVcJsGCkRL6wepfs)
- [Quellen- und Formatübersicht in GitHub](QUELLEN_TURNIERFORMATE.md)

**GitHub bleibt maßgeblich für Code, Entscheidungen, Versionen und technische Projektstände; Drive für fachliche Vorlagen, Quellen und lesbare Projektkonzepte.** Die ursprünglichen Turnierformat-Dateien werden nicht verändert.

## Aktuelle Funktionen (v0.3.1 im Repository)

- Mehrere Schleifchenturniere anlegen, bearbeiten, auswählen, löschen; Startseite mit vorhandenen Turnieren
- Name, Datum, Startzeit, Spieldauer, Wechselzeit und Wertungsspiele je Person konfigurieren
- **Anzahl der Plätze frei wählen** (1–1000, technische Eingabegrenze; kein Limit bei 7)
- **Plätze individuell benennen**, z. B. „Center Court“; Standard „Platz 1“, „Platz 2“, …
- Teilnehmende hinzufügen, bearbeiten, löschen und suchen
- Stärkegruppen (Stark/Schwächer) und Anwesenheit verwalten
- Dashboard mit Teilnehmerstatistiken; JSON-Datensicherung und -Wiederherstellung
- Auslosung der **normalen Schleifchenturnier-Vorrunden** (3 oder 4 Wertungsspiele pro Spieler), mit Runden, Zeit, Platz und Teams
- Jedes Doppelteam besteht aus 1 Stark + 1 Schwächer; eine nötige Auffüllrunde bleibt bis zu den Ergebnissen offen
- Ergebnisse pro Begegnung eingeben: optional gewonnene Games (0–99 pro Team) und **Siegerteam explizit auswählen**
- Schleifchen-Zwischenstand, gespielte Partien, Niederlagen und Siegquote; Wertung: ein Schleifchen je Person im Siegerteam
- Nach allen regulären Ergebnissen prüfen, ob genügend Spieler mit 0 oder 1 Schleifchen für die Auffüllrunde infrage kommen
- Ergebnisse ändern, löschen und mit JSON sichern bzw. wiederherstellen
- Responsive Gestaltung für Smartphone, Tablet und Computer

**Wichtige Einschränkung:** Browser-Testversion mit `localStorage`; **keine** Serverdatenbank, Mehrgeräte-Synchronisation, tatsächliche Auffüller-Auslosung, Endrunde, zentrale Livetabelle oder Mehrgerätebetrieb. Browserdaten sind nicht dauerhaft garantiert – Sicherungsfunktion nutzen. Vor realen Veranstaltungen Datenschutz, Benutzerverwaltung, Sicherheits- und Backup-Konzept umsetzen.

## Technik und Dateistruktur

- `site/index.html` – statisches HTML-Grundgerüst
- `site/assets/styles.css` – responsives Design
- `site/assets/app.js` – Benutzeroberfläche und Interaktionen
- `site/assets/storage.js` – browserbasierter Speicheradapter, Datenmodell Version 1
- `site/assets/draw.js` – Auslosungslogik und Spielplanprüfung
- `site/assets/results.js` – Spielstände, Sieger, Schleifchenwertung und Kandidatenprüfung
- `site/package.json`, `tests/draw.test.mjs`, `tests/results.test.mjs` – automatisierte Node-Tests ohne Build-Prozess
- `.github/workflows/deploy.yml` – manuell ausgelöster FTPS-Upload
- `PROJEKTSTATUS.md`, `ENTSCHEIDUNGEN.md`, `CHANGELOG.md` – Projektdokumentation

Frontend aktuell: HTML, CSS, JavaScript-Module; **kein React-Setup** und kein benötigter Node-Server. Geplant ist später ein kompatibles PHP-/MySQL-Backend bei ALL-INKL; die Architektur dafür ist noch nicht implementiert.

## Veröffentlichung

1. In GitHub **Actions → Tennis-Schiri App manuell veröffentlichen** öffnen.
2. **Run workflow** auswählen und `main` starten. Ein Commit allein veröffentlicht **nichts**.
3. Der Workflow prüft zuerst `tests/*.test.mjs` mit Node.js. Nur bei Erfolg werden `site/index.html` und die fünf Dateien in `site/assets/` per FTPS übertragen.
4. Nach erfolgreichem Upload: [https://app.tennis-schiri.de/index.html](https://app.tennis-schiri.de/index.html) aufrufen, Verzeichnispasswort eingeben und manuell testen.

Die Subdomain `app.tennis-schiri.de` ist in einem separaten ALL-INKL-Webspace-Verzeichnis mit HTTPS und Verzeichnisschutz eingerichtet. Die ursprüngliche `index.htm` kann noch vorhanden sein; deshalb zunächst `/index.html` direkt aufrufen. Die WordPress-Hauptseite `tennis-schiri.de` bleibt unabhängig.

Die GitHub-Secrets heißen `FTP_HOST`, `FTP_USER` und `FTP_PASSWORD`. **Niemals ihre Werte, private Kennwörter oder echte Spielerdaten in GitHub-Dokumentationen oder Commits speichern.** Die vorhandene `.htaccess` und der Passwortschutz dürfen beim Deployment nicht überschrieben werden.

## Nächster Entwicklungsschritt

Siehe [PROJEKTSTATUS.md](PROJEKTSTATUS.md): v0.3.1 manuell veröffentlichen und im Browser die Ergebniserfassung und den Schleifchen-Zwischenstand testen. Danach die regelgerechte Auffüllrunde und Endrunde umsetzen.

**Nach größeren Änderungen:** Projektstatus, Entscheidungen (falls relevant) und Changelog im selben Arbeitsschritt aktualisieren. Unterschied zwischen implementiert, getestet und live veröffentlicht konsequent dokumentieren.
