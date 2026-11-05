# TENNILO – Tennis-Turniermanager

**TENNILO ist der aktuelle Arbeitstitel** für die browserbasierte Turnier-App von **Tennis-Schiri**. Die endgültige Marken-/Domainentscheidung steht noch aus. Die Benutzeroberfläche verwendet vorläufig weiterhin den Namen Tennis-Schiri Turniermanager.

**Aktueller GitHub-Code:** v0.2.3 · **Live-Stand:** letzte Veröffentlichung der neueren Versionen noch zu verifizieren.

## Einstieg und Projektdokumentation

Die GitHub-Dateien sind die verbindliche Arbeitsgrundlage, auch wenn ein Chat nicht mehr verfügbar ist:

| Datei | Zweck |
| --- | --- |
| [PROJEKTSTATUS.md](PROJEKTSTATUS.md) | Tatsächlicher Stand, offen/geplant, Hosting, Tests und nächste Aufgaben |
| [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md) | Produktanforderungen, begründete Entscheidungen und Randbedingungen |
| [CHANGELOG.md](CHANGELOG.md) | Änderungen pro Version, inklusive Veröffentlichungs-/Teststatus |
| [README.md](README.md) | Projektüberblick und technische Orientierung |

**Beim Start in einem neuen Chat:** Die drei Dateien oben sowie den aktuellen Code prüfen. Nicht automatisch annehmen, dass `main` bereits auf dem Webspace läuft.

## Aktuelle Funktionen (v0.2.3 im Repository)

- Mehrere Schleifchenturniere anlegen, bearbeiten, auswählen, löschen; Startseite mit vorhandenen Turnieren
- Name, Datum, Startzeit, Spieldauer, Wechselzeit und Wertungsspiele je Person konfigurieren
- **Anzahl der Plätze frei wählen** (1–1000, technische Eingabegrenze; kein Limit bei 7)
- **Plätze individuell benennen**, z. B. „Center Court“; Standard „Platz 1“, „Platz 2“, …
- Teilnehmende hinzufügen, bearbeiten, löschen und suchen
- Stärkegruppen (Stark/Schwächer) und Anwesenheit verwalten
- Dashboard mit Teilnehmerstatistiken; JSON-Datensicherung und -Wiederherstellung
- Responsive Gestaltung für Smartphone, Tablet und Computer

**Wichtige Einschränkung:** Browser-Testversion mit `localStorage`; **keine** Serverdatenbank, Mehrgeräte-Synchronisation, vollständige Auslosungslogik, Ergebniserfassung oder Livetabellen. Browserdaten sind nicht dauerhaft garantiert – Sicherungsfunktion nutzen. Vor realen Veranstaltungen Datenschutz, Benutzerverwaltung, Sicherheits- und Backup-Konzept umsetzen.

## Technik und Dateistruktur

- `site/index.html` – statisches HTML-Grundgerüst
- `site/assets/styles.css` – responsives Design
- `site/assets/app.js` – Benutzeroberfläche und Interaktionen
- `site/assets/storage.js` – browserbasierter Speicheradapter, Datenmodell Version 1
- `.github/workflows/deploy.yml` – manuell ausgelöster FTPS-Upload
- `PROJEKTSTATUS.md`, `ENTSCHEIDUNGEN.md`, `CHANGELOG.md` – Projektdokumentation

Frontend aktuell: HTML, CSS, JavaScript-Module; **kein React-Setup** und kein benötigter Node-Server. Geplant ist später ein kompatibles PHP-/MySQL-Backend bei ALL-INKL; die Architektur dafür ist noch nicht implementiert.

## Veröffentlichung

1. In GitHub **Actions → Tennis-Schiri App manuell veröffentlichen** öffnen.
2. **Run workflow** auswählen und `main` starten. Ein Commit allein veröffentlicht **nichts**.
3. Der Workflow überträgt ausschließlich `site/index.html` und die drei Dateien in `site/assets/` per FTPS.
4. Nach erfolgreichem Upload: [https://app.tennis-schiri.de/index.html](https://app.tennis-schiri.de/index.html) aufrufen, Verzeichnispasswort eingeben und manuell testen.

Die Subdomain `app.tennis-schiri.de` ist in einem separaten ALL-INKL-Webspace-Verzeichnis mit HTTPS und Verzeichnisschutz eingerichtet. Die ursprüngliche `index.htm` kann noch vorhanden sein; deshalb zunächst `/index.html` direkt aufrufen. Die WordPress-Hauptseite `tennis-schiri.de` bleibt unabhängig.

Die GitHub-Secrets heißen `FTP_HOST`, `FTP_USER` und `FTP_PASSWORD`. **Niemals ihre Werte, private Kennwörter oder echte Spielerdaten in GitHub-Dokumentationen oder Commits speichern.** Die vorhandene `.htaccess` und der Passwortschutz dürfen beim Deployment nicht überschrieben werden.

## Nächster Entwicklungsschritt

Siehe [PROJEKTSTATUS.md](PROJEKTSTATUS.md): v0.2.3 auf dem Webspace prüfen, dann die Schleifchenturnier-Auslosungslogik aus der vorhandenen Google-Tabelle übernehmen und systematisch testen.

**Nach größeren Änderungen:** Projektstatus, Entscheidungen (falls relevant) und Changelog im selben Arbeitsschritt aktualisieren. Unterschied zwischen implementiert, getestet und live veröffentlicht konsequent dokumentieren.
