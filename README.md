# TENNILO – Tennis-Turniermanager

**TENNILO ist der aktuelle Arbeitstitel** für die browserbasierte Turnier-App von **Tennis-Schiri**. Die endgültige Marken-/Domainentscheidung steht noch aus. Die Benutzeroberfläche verwendet vorläufig weiterhin den Namen Tennis-Schiri Turniermanager.

**Aktueller GitHub-Code:** **v0.5.0** (Nenngeld und Rundenuhr, noch nicht live). **Letzter bestätigter FTPS-Upload:** **v0.4.0** vom 2026-11-05 ([GitHub Actions Run 42013798677](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42013798677)). Der Nutzer hat die Endrunde positiv angetestet; vollständige Praxis- und Sicherheitstests bleiben offen.

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

## Aktuelle Funktionen (v0.5.0 im Repository)

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
- **Kompakte Ergebnisansicht nach dem Speichern:** Ergebnis direkt zwischen den Doppel-Teams, Sieger deutlich hervorgehoben, Eingabeformular ausgeblendet; „Ergebnis ändern“ öffnet die vorausgefüllten Felder und „Abbrechen“ verwirft ungespeicherte Änderungen
- **Auffüllrunde nach V7:** Nach vollständigen regulären Ergebnissen automatisch 0-/1-Schleifchen-Auffüllspieler auswählen; die Zusatzspiele zählen nur für die regulären Teilnehmer
- Auffüller im Spielplan gelb markiert, eigene Ergebnisfelder und sichere Rücknahme der Auffüllrunde; normale Ergebnisse bleiben dabei erhalten
- **Testvorlage:** Über „Auffüllrunde testen“ direkt eine 5+5-Spieler-Demo mit drei Wertungsspielen und drei Plätzen anlegen
- **Endrunde (v0.4.0):** 8 oder 16 Teilnehmer nach Schleifchenzahl qualifizieren; Spieler können abgewählt werden und die nächsten berechtigten Personen rücken automatisch nach
- Ausgeloste **feste Doppelpartner** (zuerst Stark/Schwächer, bei Bedarf gleichgruppige Teams) mit Halbfinale und Finale; bei 16 Endrundenteilnehmern zusätzlich Viertelfinale
- Sieger ziehen automatisch in die nächste Runde ein; Ergebnisse und Änderungen werden gespeichert. Das Sieger-Doppel wird am Ende hervorgehoben
- Endrunde zurücknehmen, ohne die Vorrunden- oder Auffüllrunden-Ergebnisse zu verlieren; diese sind während einer aktiven Endrunde gegen Änderungen geschützt
- **Bar-Nenngeld:** pro Turnier einen Standardbetrag einstellen (anfangs 0,00 €); bei jedem Teilnehmer einen individuellen Betrag bzw. 0,00 € für beitragsfrei erfassen
- Eigener Bereich **Nenngeld** mit Sollbetrag, tatsächlich bar erhaltenem Betrag, offenen Beträgen, Teilzahlungen und Korrekturen. Keine Online-Zahlungsanbieter; Buchung nur nach tatsächlicher Barzahlung
- **Geplante Spielzeiten im Spielplan:** pro Runde sowie an jeder Begegnung Start-/Endzeit; Wechsel-/Pausenende aus Startzeit, Spieldauer und Pause berechnet
- **Rundenuhr:** „Runde starten“, Pausieren, Fortsetzen, Beenden und bestätigtes Zurücksetzen. Sekunden-Countdown mit Überzeitanzeige; reale Zeitstempel bleiben bei Neuladen und JSON-Sicherung erhalten
- Gleichzeitige laufende Rundenuhren desselben Turniers werden verhindert; eine erneute Auslosung verwirft die zugehörigen Uhren nach Bestätigung
- Responsive Gestaltung für Smartphone, Tablet und Computer

**Wichtige Einschränkung:** Browser-Testversion mit `localStorage`; **keine** Serverdatenbank, Mehrgeräte-Synchronisation, zentrale Liveveröffentlichung für andere Geräte oder eigenständige Doppelturnierverwaltung. Browserdaten sind nicht dauerhaft garantiert – Sicherungsfunktion nutzen. Vor realen Veranstaltungen Datenschutz, Benutzerverwaltung, Sicherheits- und Backup-Konzept umsetzen.

## Technik und Dateistruktur

- `site/index.html` – statisches HTML-Grundgerüst
- `site/assets/styles.css` – responsives Design
- `site/assets/app.js` – Benutzeroberfläche und Interaktionen
- `site/assets/storage.js` – browserbasierter Speicheradapter, Datenmodell Version 1
- `site/assets/draw.js` – Auslosungslogik und Spielplanprüfung
- `site/assets/results.js` – Spielstände, Sieger, Schleifchenwertung und Kandidatenprüfung
- `site/assets/special.js` – separate Auffüller-Auslosung, Validierung und Rücknahme
- `site/assets/finals.js` – Endrunden-Qualifikation, feste Doppel, K.-o.-Fortschritt und Ergebnisprüfung
- `site/assets/finals-ui.js` – Endrunden-Oberfläche mit Teilnehmerauswahl und Turniersieger
- `site/assets/operations.js` – Nenngeld-Beträge, geplante Rundentermine und persistierte Uhrzeiten
- `site/assets/operations-ui.js` – Kassenübersicht und Rundenuhr-Bedienoberfläche
- `site/package.json`, `tests/draw.test.mjs`, `tests/results.test.mjs`, `tests/result-ui.test.mjs`, `tests/special.test.mjs`, `tests/special-ui.test.mjs`, `tests/finals.test.mjs`, `tests/finals-ui.test.mjs`, `tests/operations.test.mjs`, `tests/operations-ui.test.mjs` – automatisierte Logik- und UI-Regressionsprüfungen ohne Build-Prozess
- `.github/workflows/deploy.yml` – manuell ausgelöster FTPS-Upload
- `PROJEKTSTATUS.md`, `ENTSCHEIDUNGEN.md`, `CHANGELOG.md` – Projektdokumentation

Frontend aktuell: HTML, CSS, JavaScript-Module; **kein React-Setup** und kein benötigter Node-Server. Geplant ist später ein kompatibles PHP-/MySQL-Backend bei ALL-INKL; die Architektur dafür ist noch nicht implementiert.

## Veröffentlichung

1. In GitHub **Actions → Tennis-Schiri App manuell veröffentlichen** öffnen.
2. **Run workflow** auswählen und `main` starten. Ein Commit allein veröffentlicht **nichts**.
3. Der Workflow prüft zuerst `tests/*.test.mjs` mit Node.js. Nur bei Erfolg werden `site/index.html` und die zehn ausdrücklich freigegebenen Dateien in `site/assets/`, die `site/index.html` und das vorhandene Favicon per FTPS übertragen.
4. Nach erfolgreichem Upload: [https://app.tennis-schiri.de/index.html](https://app.tennis-schiri.de/index.html) aufrufen, Verzeichnispasswort eingeben und manuell testen.

Die Subdomain `app.tennis-schiri.de` ist in einem separaten ALL-INKL-Webspace-Verzeichnis mit HTTPS und Verzeichnisschutz eingerichtet. Die ursprüngliche `index.htm` kann noch vorhanden sein; deshalb zunächst `/index.html` direkt aufrufen. Die WordPress-Hauptseite `tennis-schiri.de` bleibt unabhängig.

Die GitHub-Secrets heißen `FTP_HOST`, `FTP_USER` und `FTP_PASSWORD`. **Niemals ihre Werte, private Kennwörter oder echte Spielerdaten in GitHub-Dokumentationen oder Commits speichern.** Die vorhandene `.htaccess` und der Passwortschutz dürfen beim Deployment nicht überschrieben werden.

## Nächster Entwicklungsschritt

Siehe [PROJEKTSTATUS.md](PROJEKTSTATUS.md): Zunächst **beim Schleifchenturnier bleiben**. Version 0.5.0 mit Bar-Nenngeld, Spielzeiten und Rundenuhr manuell veröffentlichen und im Browser testen. Anschließend weitere Schleifchenturnier-Anforderungen und Praxisabläufe prüfen. Ein Doppelturnier-Modul ist aktuell **nicht** der nächste Schritt.

**Nach größeren Änderungen:** Projektstatus, Entscheidungen (falls relevant) und Changelog im selben Arbeitsschritt aktualisieren. Unterschied zwischen implementiert, getestet und live veröffentlicht konsequent dokumentieren.
