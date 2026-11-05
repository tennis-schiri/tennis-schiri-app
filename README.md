# TENNILO – Tennis-Turniermanager

**TENNILO ist der aktuelle Arbeitstitel** für die browserbasierte Turnier-App von **Tennis-Schiri**. Die endgültige Marken-/Domainentscheidung steht noch aus. Die Benutzeroberfläche verwendet vorläufig weiterhin den Namen Tennis-Schiri Turniermanager.

**Aktueller App-Code:** **v0.6.1**, am 2026-11-05 manuell via FTPS veröffentlicht ([GitHub-Lauf 42044203175](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42044203175)); der reale Zweitgeräte-Test auf ALL-INKL ist weiterhin offen. **Zusätzlich privat entwickelt:** Backend B0.1/B0.2 mit Kontodatenbank, Registrierung, E-Mail-Bestätigung, Login/Sessions, Vereinsanlage, Rollen und Einladungen. Gegen temporäre MariaDB geprüft. **Die Konto-API ist standardmäßig deaktiviert; es gibt weder eine öffentliche Registrierungsseite noch eine Produktivdatenbank.**

## Einstieg und Projektdokumentation

Die GitHub-Dateien sind die verbindliche Arbeitsgrundlage, auch wenn ein Chat nicht mehr verfügbar ist:

| Datei | Zweck |
| --- | --- |
| [PROJEKTSTATUS.md](PROJEKTSTATUS.md) | Tatsächlicher Stand, offen/geplant, Hosting, Tests und nächste Aufgaben |
| [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md) | Produktanforderungen, begründete Entscheidungen und Randbedingungen |
| [CHANGELOG.md](CHANGELOG.md) | Änderungen pro Version, inklusive Veröffentlichungs-/Teststatus |
| [QUELLEN_TURNIERFORMATE.md](QUELLEN_TURNIERFORMATE.md) | Google-Drive-Turnierbibliothek, formatbezogene Referenzen und gemeinsamer Dokumentationsordner |
| [README.md](README.md) | Projektüberblick und technische Orientierung |
| [BACKEND_KONZEPT.md](BACKEND_KONZEPT.md) | Vorschlag für Registrierung, Vereine, Rollen, serverseitige Turniere, TENNILO-Lizenzen, Zahlung und vorläufige Preise |
| [backend/README.md](backend/README.md) | Backend B0.1/B0.2: Datenbank, Registrierung, Vereinsrollen, Backend-Schutz und CI-Tests |
| [backend/HTTP_API.md](backend/HTTP_API.md) | Private JSON-API und Sicherheitsbedingungen vor einer späteren Staging-Freigabe |

**Beim Start in einem neuen Chat:** Die drei Dateien oben sowie den aktuellen Code prüfen. Nicht automatisch annehmen, dass `main` bereits auf dem Webspace läuft.

## Google Drive als ergänzende Projektdokumentation

- [TENNILO – Dokumentation (Drive-Ordner)](https://drive.google.com/drive/folders/1w6WBQH0o5MEwnKn3ZuuN43HiHaxvMnBg)
- [TENNILO – Projektwegweiser (Google Doc)](https://docs.google.com/document/d/1d9Gx6AahC1RbEVFtavmo4Y8UAU7_R6EzmmiWQ5mlZr8/edit)
- [Vorhandene Bibliothek „Turnierformate“](https://drive.google.com/drive/folders/1aPuhuzKZvif5RnfXXVcJsGCkRL6wepfs)
- [Quellen- und Formatübersicht in GitHub](QUELLEN_TURNIERFORMATE.md)

**GitHub bleibt maßgeblich für Code, Entscheidungen, Versionen und technische Projektstände; Drive für fachliche Vorlagen, Quellen und lesbare Projektkonzepte.** Die ursprünglichen Turnierformat-Dateien werden nicht verändert.

## Privates Backend B0.1/B0.2 – nicht veröffentlicht

Unter [backend/](backend/README.md) liegen Datenbanktabellen sowie die implementierten **privaten Registrierungs-, Login-, Vereins- und Einladungsschnittstellen**. Registrierung und E-Mail-Bestätigung, Sitzungen, Passwort-Reset, Mitgliedschafts- und Rollenprüfung wurden gegen temporäre MariaDB getestet. Die [HTTP-API](backend/HTTP_API.md) ist **standardmäßig deaktiviert**; bestehender FTPS-Deploy lädt **keine** Backend-Dateien hoch. Konto-Oberfläche, geprüfter Mailversand, ALL-INKL-Staging, zentrale Turnierdaten und Softwarezahlungen fehlen noch; verbindliche Preise sind offen.

## Aktuelle Funktionen (v0.6.1 im Repository)

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
- **v0.5.1:** Anwesenheit und Nenngeld in **einer gemeinsamen Teilnehmer-/Check-in-Liste**: Stärkegruppe, Anwesenheits-Häkchen, Nenngeld-Kategorie, Soll, bar erhalten, offen und Korrekturen stehen pro Spieler nebeneinander
- **Mehrere Nenngeld-Kategorien** (z. B. Jugend/Erwachsene), frei konfigurierbar unter Einstellungen, zuweisbar je Spieler; bisherige Turniere behalten ihren Betrag als Kategorie „Standard“
- Zahlungsbeträge bleiben bei Kategorie-/Tarifänderungen erhalten; Kategorien, die noch Spielern zugeordnet sind, können nicht versehentlich gelöscht werden
- Gemeinsame Teilnehmerliste mit Sollbetrag, tatsächlich bar erhaltenem Betrag, offenen Beträgen, Teilzahlungen und Korrekturen. Keine Online-Zahlungsanbieter; Buchung nur nach tatsächlicher Barzahlung
- **Geplante Spielzeiten im Spielplan:** pro Runde sowie an jeder Begegnung Start-/Endzeit; Wechsel-/Pausenende aus Startzeit, Spieldauer und Pause berechnet
- **Rundenuhr:** „Runde starten“, Pausieren, Fortsetzen, Beenden und bestätigtes Zurücksetzen. Sekunden-Countdown mit Überzeitanzeige; reale Zeitstempel bleiben bei Neuladen und JSON-Sicherung erhalten
- **Live-Monitor (v0.6.0):** Eigene großformatige, schreibgeschützte Seite `site/live.html` für ein zweites Browserfenster auf einem angeschlossenen Bildschirm; Vollbildschaltfläche, aktuelle Platzpaarungen, markierte Sieger und Ergebnisse, laufende Rundenuhr, Schleifchen-Zwischenstand sowie Endrunde bis zum Sieger-Doppel
- **v0.6.1 – echte Fernanzeige:** Auf der Turnierleitung ausdrücklich „Fernanzeige aktivieren“ anklicken und den Zuschauer-Link kopieren. Dieser öffnet die Monitorseite auch auf **einem anderen Laptop/Tablet/Smart-TV** mit Internet und Zugang zum geschützten Webspace. Der Browser sendet nur Anzeigedaten an `site/live-feed.php`; Zuschauer lesen sie im Abstand weniger Sekunden, können aber nichts verändern.
- Zugriff über zwei voneinander getrennte zufällige Geheimnisse (Leseschlüssel im URL-Fragment, Schreibschlüssel nur im Browser der Turnierleitung). „Freigabe beenden“ widerruft den Link; Server-Snapshots laufen spätestens nach 24 Stunden ohne Veröffentlichung ab.
- Der PHP-Dienst speichert nur kurzlebige **Spielpaarungen, Ergebnisse, Rangliste, Rundenuhr und Endrundenstand** in einem nicht öffentlich auslieferbaren temporären Serverordner. Keine Nenngeld-/Check-in-/Barzahlungsdaten, keine zentrale Turnierdatenbank oder gemeinsames Bearbeiten. Der bestehende Webspace-Passwortschutz gilt weiterhin; ein zweites Gerät muss sich möglicherweise dort anmelden.
- Live-Anzeige aktualisiert sich bei Änderungen in der Turnierleitung automatisch über gemeinsamen Browser-Speicher (`storage`-Ereignis mit zusätzlicher Prüfung jede Sekunde). Eine Runde kann gezielt auf den Monitor gelegt werden; alternativ Auswahl der laufenden Runde bzw. Endrunde automatisch. Aktive Monitor-Auswahl bleibt im JSON-Backup erhalten
- **Zwei Betriebsarten:** Die lokale Anzeige bleibt zwischen Fenstern desselben Browserprofils nutzbar. Die ausdrücklich aktivierte **Fernanzeige** nutzt hingegen PHP-Snapshots auf dem Webserver und funktioniert geräteübergreifend. Beide sind schreibgeschützte Zuschaueransichten. Die eigentlichen Turnierdaten bleiben lokal und müssen weiterhin per JSON gesichert werden.
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
- `site/live.html`, `site/assets/live.css` – separate Vollbildansicht für den zweiten Monitor
- `site/assets/live-model.js`, `site/assets/live-ui.js`, `site/assets/live.js` – Live-Anzeige, datensparsame Darstellung, Reaktion auf Spielstandänderungen
- `site/live-feed.php`, `site/assets/remote-live.js` – serverseitige, zeitlich begrenzte Anzeigedaten und sichere Aktivierung/Viderruf der Fernanzeige
- `site/package.json`, `tests/draw.test.mjs`, `tests/results.test.mjs`, `tests/result-ui.test.mjs`, `tests/special.test.mjs`, `tests/special-ui.test.mjs`, `tests/finals.test.mjs`, `tests/finals-ui.test.mjs`, `tests/operations.test.mjs`, `tests/operations-ui.test.mjs`, `tests/fee-tiers.test.mjs`, `tests/fee-tiers-ui.test.mjs`, `tests/live.test.mjs`, `tests/live-ui.test.mjs`, `tests/live-controller.test.mjs`, `tests/live-sync.test.mjs`, `tests/remote-live.test.mjs`, `tests/live-feed.test.mjs`, `tests/remote-publisher-ui.test.mjs`, `tests/remote-viewer-ui.test.mjs` – automatisierte Logik- und UI-Regressionsprüfungen ohne Build-Prozess
- `.github/workflows/deploy.yml` – manuell ausgelöster FTPS-Upload
- `PROJEKTSTATUS.md`, `ENTSCHEIDUNGEN.md`, `CHANGELOG.md` – Projektdokumentation

Frontend aktuell: HTML, CSS, JavaScript-Module; **kein React-Setup** und kein benötigter Node-Server. Geplant ist später ein kompatibles PHP-/MySQL-Backend bei ALL-INKL; die Architektur dafür ist noch nicht implementiert.

## Veröffentlichung

1. In GitHub **Actions → Tennis-Schiri App manuell veröffentlichen** öffnen.
2. **Run workflow** auswählen und `main` starten. Ein Commit allein veröffentlicht **nichts**.
3. Der Workflow prüft zuerst die PHP-Version/-Syntax und danach sämtliche `tests/*.test.mjs`, einschließlich einer API-Integration mit lokalem PHP-Testserver. Nur bei Erfolg überträgt er **19 ausdrücklich freigegebene Dateien** per FTPS; `.htaccess`, `index.htm` und WordPress bleiben unberührt.
4. Nach erfolgreichem Upload: [https://app.tennis-schiri.de/index.html](https://app.tennis-schiri.de/index.html) aufrufen, Verzeichnispasswort eingeben und manuell testen.

Die Subdomain `app.tennis-schiri.de` ist in einem separaten ALL-INKL-Webspace-Verzeichnis mit HTTPS und Verzeichnisschutz eingerichtet. Die ursprüngliche `index.htm` kann noch vorhanden sein; deshalb zunächst `/index.html` direkt aufrufen. Die WordPress-Hauptseite `tennis-schiri.de` bleibt unabhängig.

Die GitHub-Secrets heißen `FTP_HOST`, `FTP_USER` und `FTP_PASSWORD`. **Niemals ihre Werte, private Kennwörter oder echte Spielerdaten in GitHub-Dokumentationen oder Commits speichern.** Die vorhandene `.htaccess` und der Passwortschutz dürfen beim Deployment nicht überschrieben werden.

## Nächster Entwicklungsschritt

Siehe [PROJEKTSTATUS.md](PROJEKTSTATUS.md): **v0.6.1** nach Freigabe manuell über GitHub Actions veröffentlichen. Auf dem Rechner der Turnierleitung **Fernanzeige aktivieren**, Live-Link kopieren, auf einem **separaten Laptop/Tablet/Smart-TV** öffnen und dort den Webspace-Passwortschutz bestätigen. Runde starten, Ergebnisse erfassen, Nachführung und Widerruf prüfen. Ein echtes Backend für gemeinsames Bearbeiten kommt erst in einer späteren Entwicklungsphase.

**Nach größeren Änderungen:** Projektstatus, Entscheidungen (falls relevant) und Changelog im selben Arbeitsschritt aktualisieren. Unterschied zwischen implementiert, getestet und live veröffentlicht konsequent dokumentieren.
