# TENNILO – Änderungsverlauf (Changelog)

**Stand:** 2026-11-05  
**Produktname:** TENNILO (Arbeitstitel) · frühere UI-Bezeichnung „Tennis-Schiri Turniermanager“

In diesem Dokument bedeutet **„implementiert“**: Änderung liegt im GitHub-Repository vor. Das ist **kein** Nachweis, dass sie bereits auf `app.tennis-schiri.de` veröffentlicht oder auf allen Geräten getestet wurde. Veröffentlichung und Tests gesondert im [Projektstatus](PROJEKTSTATUS.md) vermerken.

## [0.7.0 Live-Monitor-Layout] – Kompakte Paarungen und nächste Runde (nur GitHub)

**2026-11-05:** Gemeinsame Monitoransicht beider Turnierarten überarbeitet: kleinere Karten und Schrift, bei mehr als vier gleichzeitig angezeigten Plätzen ein dichteres Raster, dazu unter den aktuellen Begegnungen der bereits ausgeloste nächste Spielblock mit geplanter Startzeit. Die bestehende Livetabelle bleibt immer neben dem Spielplan bzw. unter ihm auf schmalen Bildschirmen. Nächste Runde nur anzeigen, wenn sie tatsächlich existiert; keine fiktiven Paarungen. Für Play-offs wird eine folgende Stufe nur bei feststehenden Paarungen angekündigt. Der gefilterte PHP-Snapshot erlaubt das neue `nextRound`-Objekt mit derselben strikten Paarungs-Whitelist; keine Kassen-/Check-in-Daten. Tests in `live.test.mjs`, `doubles-live.test.mjs`, `live-ui.test.mjs` und `live-feed.test.mjs` ergänzt. **Kein FTPS-Upload; echte Browser-/GitHub-CI-Prüfung noch offen.**

## [0.7.0] – Doppelturnier mit festen Partnern (nur GitHub, nicht veröffentlicht)

**2026-11-05:** Neue eigenständige Turnierart als lokale Testversion implementiert. Letzter bestätigter FTP-Upload bleibt **v0.6.1** (Run 42044203175). Noch keine Freigabe, kein Webhosting-Test und kein neuer Upload.

- Eigene `site/doppel.html`-Oberfläche für feste Zweierteams. Hauptstartseite zeigt sowohl Schleifchen- als auch Doppelturniere und öffnet den passenden Modus.
- Teams mit je zwei Spielern, Anwesenheit, Bar-Nenngeld individuell pro Spieler (Standard und ermäßigt), Einzahlungssummen sowie manuelle Korrektur.
- Wiederholungsfreie Vorrundenauslosung mit Standard vier und wählbar 1–8 Spielen je anwesendem Team; berechnet zusätzliche Zeitblöcke bei knappen Plätzen. Ungerade Teamzahlen werden unterstützt, sofern dieselbe Zahl Begegnungen je Team mathematisch möglich ist.
- Games, Entscheidungspunkte bei Gleichstand und explizite Siegerauswahl; Tabelle nach Siegen, Game-Differenz und Games+.
- Play-offs für die besten acht zugelassenen Teams inklusive Abwahl/Nachrücken, Viertelfinale, Halbfinale, Finale und Platz 3. Korrekturen an einem früheren Sieger setzen abhängige Resultate zurück.
- Spielzeiten, Rundenuhr und konfigurierbare Platznamen/-anzahl. Teams nach Auslosung für Änderungen gesperrt, Kassenkorrekturen weiterhin möglich.
- Neues `type: doubles` mit separatem `doubles`-Modell in bestehendem Browser- und JSON-Backup; alte Schleifchenturniere bleiben `type: ribbon`. Der Doppelmodus bietet jetzt auch den direkten JSON-Import mit ausdrücklicher Warnung vor dem Ersetzen bisheriger Daten.
- `tests/doubles.test.mjs` mit 18 Logikfällen im isolierten JavaScript-Testlauf erfolgreich; `tests/doubles-ui.test.mjs` als UI-/Deploy-Regressionsprüfung ergänzt. Vollständige GitHub-CI und echte Browser-/Mobiltests weiterhin offen.
- Vier neue App-Dateien in die **manuell** gestartete FTPS-Allowlist aufgenommen (nun 23). Kein automatischer Produktiv-Upload. `backend/` bleibt vollständig ausgeschlossen.
- Regeln, Grenzen und offene Punkte: [DOPPEL_KONZEPT.md](DOPPEL_KONZEPT.md). Schreibgeschützte Doppel-Fernanzeige jetzt im privaten Code integriert, echte Zwei-Geräte-/PHP-Tests offen; zentrale Mehrgeräte-Bearbeitung weiterhin offen.

### Ergänzt: geschützte Live-Fernanzeige auch für Doppelturniere

- Dieselbe Vollbild-Zuschauerseite `site/live.html` unterstützt jetzt beide Turnierarten. Für feste Doppelteams: Ansetzungen, Spielzeiten, Ergebnis/Games, Sieger, Teamrangliste nach Siegen und Game-Differenz sowie Viertel-/Halbfinale, Finale und Platz 3.
- Neue Freigabe- und Widerruf-Schaltflächen in der Doppelturnierleitung, einschließlich gezielter Rundenauswahl und automatisch angezeigter Play-offs. Bestehende Lese-/Schreibschlüssel und 24-Stunden-Gültigkeit bleiben erhalten.
- PHP-Anzeigefilter auf sichere `doubles`-Ranglistenfelder und mehr Zeitblöcke erweitert; weiterhin keine Nenngelder, Barzahlungen oder Anwesenheitslisten im Zuschauer-Snapshot.
- `tests/doubles-live.test.mjs`, `tests/doubles-remote-publisher-ui.test.mjs` und zusätzliche Doppel-PHP-Integration. Noch keine bestätigte gesamte CI oder echter Geräte-/Hosting-Test; **keine Veröffentlichung**.

## [Backend B0.2 UI-Prototyp] – Konto- und Vereinsoberflächen (nicht veröffentlicht)

**2026-11-05:** Unter `backend/staging-ui/` eine eigenständige, responsive Kontoseite im TENNILO-Farbschema erstellt. Sie bedient die bestehende private Konto-/Vereins-API: Registrierung, Mail-Bestätigung und erneuter Link, Login/Logout, Passwort-Reset, Verein anlegen/wechseln, Mitglieder lesen, Einladungen versenden/annehmen sowie Rollenänderung/Entfernen durch Besitzer. Einmal-Link-Tokens werden aus dem Browser-URL-Fragment entfernt; keine Credentials im Browser-Speicher; Darstellung untrusted Daten als Text.

Neue Sicherheits-/Syntaxregressionen unter `tests/account-staging-ui.test.mjs`. Die vier UI-Dateien sind **nicht** in der 19-Dateien-Allowlist des manuellen FTPS-Deployments. Staging-Datenbank, Mailzustellung und echte Browser-End-to-End-Tests fehlen weiterhin; API standardmäßig deaktiviert. **Keine Veröffentlichung, keine Freischaltung für reale Benutzer.** [Staging-UI-Dokumentation](backend/staging-ui/README.md).

## [Backend B0.2] – Private Registrierung und Vereinsverwaltung (nicht veröffentlicht)

**Stand 2026-11-05:** Backend-Dienste und eine **standardmäßig deaktivierte** HTTP-API im privaten Repository implementiert. API, E-Mail-Kontoseiten und SQL-Migrationen wurden **nicht** in den produktiven Webspace übertragen. Keine öffentliche Registrierung oder TENNILO-Lizenzzahlung aktiv.

### Implementiert
- Benutzer registrieren sich mit E-Mail und sicher gehashtem Passwort. Konto bleibt bis zur E-Mail-Bestätigung gesperrt; Einmallink kann neu angefordert werden. Login, Logout, 12-Stunden-Sitzung/CSRF-Cookies und Passwort-Reset mit Sitzungswiderruf sind im Backend umgesetzt.
- Verifizierte Nutzer können einen Verein anlegen: Verein und erstes Besitzer-Mitglied werden atomar gespeichert. Besitzer laden Organisatoren/Leser ein; die Einladung ist nur für das passende E-Mail-Konto gültig und nur einmal verwendbar. Rollen und Vereinsgrenzen werden serverseitig geprüft, der letzte aktive Besitzer kann nicht entfernt oder herabgestuft werden.
- Geschützte JSON-API mit exakter HTTPS-Origin-Prüfung, CSRF-Schutz, sicheren Cookies, minimalen Fehlerantworten und persistentem HMAC-basiertem Rate-Limit für Registrierungen, Anmeldungen, Mails, Einladungen und Vereinsanlage.
- SQL-Migration `002_auth_request_limits.sql`, private PHP-Dienste und `backend/public/index.php`, der ohne ausdrückliche Konfiguration (`TENNILO_API_ENABLED=1`) geschlossen bleibt. Optionaler `mail()`-Transport ist technisch vorbereitet, **noch nicht bei ALL-INKL getestet**.
- CI-Prüfungen inklusive PHP-Syntax, SQL-Struktur, Vereins-/Auth-/API-Integration gegen temporäre MariaDB. [API- und Sicherheitsdokumentation](backend/HTTP_API.md).

### Noch offen
- Bereits als isolierter unveröffentlichter Prototyp erstellte Login-/Registrierungs-/Bestätigungs-/Vereinsseiten benötigen noch Browser-E2E-Tests; nachweislich funktionierender Versand von Bestätigungs- und Einladungsmails, getrennte ALL-INKL-Testinstallation und Browser-End-to-End-Tests.
- Persistente Vereins-/Turnierdaten, JSON-Migration der bisher lokal gespeicherten Turniere, freigegebene Softwarelizenzen, Zahlungsanbieter, Rechnungserstellung und endgültige Preise.
- Unverändert: Schleifchenturnier-App v0.6.1 und der manuelle FTPS-Upload; Backend-Dateien werden nicht veröffentlicht. Nenngelder bleiben bar beim Verein.

## [Backend B0.1] – Vereins- und Kontodatenmodell (noch keine App-Veröffentlichung)

**2026-11-05:** Im privaten Repository umgesetzt; keine neuen Produktivdateien oder Registrierungsseiten veröffentlicht. **Noch keine echten Kundenkonten oder ALL-INKL-Datenbank angelegt.**

- Erste MariaDB/MySQL-Migration mit zwölf Tabellen für Benutzer, Vereine, Mitgliedschaften, Einladungen, Bestätigung/Passwort-Reset, sichere Sessions, Lizenzpläne, organisationsbezogene Lizenzzuordnung und Audit.
- PHP-Sicherheitsbasis mit Passwort-Hashing, kryptographisch zufälligen Hash-Tokens, UUIDs, Formularvalidierung, Rollenmatrix und zeitlicher Lizenzprüfung.
- Privater PDO-Connector mit Umgebungsvariablen und ein CLI-only-Migrator mit ausdrücklicher Freigabe und SHA-256-Integritätsprüfung; **beides vom bestehenden FTPS-Upload ausgeschlossen**.
- Erweiterter GitHub-Prüfworkflow: PHP-Syntax und 13 Kontoregeltests, 12 zusätzliche statische SQL-/Sicherheitsprüfungen sowie echte Installations-/Integritätsprüfung gegen eine temporäre MariaDB in CI; keine Produktionsdaten.
- Dokumentation: [backend/README.md](backend/README.md), [BACKEND_KONZEPT.md](BACKEND_KONZEPT.md), [PROJEKTSTATUS.md](PROJEKTSTATUS.md).
- Folgend: B0.2 mit registrierten Benutzerkonten, E-Mail-Bestätigung, Login, Organisation anlegen und Einladungen. Rechnungen, Zahlungsanbieter und definitive Preise sind noch offen.

## [0.6.1] – Fernanzeige auf eigenständigem Laptop, Tablet und Smart-TV

**Stand 2026-11-05:** v0.6.1 wurde nach grünem Code-Prüflauf ([42042177880](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42042177880)) im manuellen [FTPS-Lauf 42044203175](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42044203175) erfolgreich hochgeladen. **Webhosting-Funktion und unabhängiger Smart-TV-/Zweitgeräte-Test sind noch nicht bestätigt.**

### Neu
- Eigene, **serverbasierte, aber ausschließlich lesende Fernanzeige**: Anders als v0.6.0 kann der Zuschauer nun auf einem anderen Gerät im Internet sitzen. Keine gemeinsame Browser-Session erforderlich.
- Turnierleitung schaltet die Freigabe **bewusst** über „Fernanzeige aktivieren“ ein. Danach kann sie einen zufälligen Live-Link kopieren oder im Browser öffnen. „Freigabe beenden“ widerruft den Link und löscht den Snapshot.
- Neuer `site/live-feed.php` auf dem bestehenden ALL-INKL-Webspace. Veröffentlichung per JSON-POST, Zuschauerdaten per GET mit Lese-Schlüssel im HTTP-Header; Übertragung etwa alle drei Sekunden. Keine weitere Hosting-Plattform und für dieses Live-Zwischenstadium noch keine MariaDB-Datenbank erforderlich.
- Der Monitor-Link enthält einen zufälligen 192-Bit-**Leseschlüssel** ausschließlich im URL-Fragment. Ein weiterer, separater Schreibschlüssel verbleibt im Browser der Turnierleitung und wird **nicht** ins JSON-Turnierbackup aufgenommen.
- Der PHP-Dienst speichert **nur** das für die Live-Anzeige zulässige Datenmodell (Spielpaarungen, Court-Namen, Game-Ergebnisse, Sieger, Schleifchen-Topliste, Countdown/Endrunde). Turnierkasse, Barzahlungen, Anwesenheitsverwaltung und alle unbenötigten Verwaltungsfelder sind im serverseitigen Allowlist-Filter ausgeschlossen.
- Kurzlebige Snapshots im nicht öffentlich abrufbaren PHP-Temp-Verzeichnis; Ablauf nach 24 Stunden ohne erneute Veröffentlichung, gelegentliche Bereinigung. Der Zuschauer-Tab erkennt unterbrochene Live-Signale und abgelaufene/widerrufene Links.
- Zuschauerseite synchronisiert ihre Uhr über den Server-Zeitstempel des letzten Snapshots und zählt lokal in Sekunden weiter – ohne dass die Uhrzeit des Smart-TV exakt mit der Turnierleitungs-Uhr übereinstimmen muss.
- Die lokale Zwei-Fenster-Funktion bleibt weiterhin verfügbar; bei URL-Fragment `#kanal=...` wird automatisch der Server-Livemodus verwendet.
- GitHub-Workflow prüft **PHP-Version/Syntax und alle App- und Serverintegrationstests** vor dem unverändert manuellen Upload. Erlaubte Uploadliste um `live-feed.php` und `remote-live.js` auf **19 Dateien** erweitert. Neue reine CI-Prüfung `.github/workflows/verify.yml` ohne Upload.
- Zusätzliche Tests `remote-live.test.mjs` (8), `live-feed.test.mjs` (PHP-Testserver), `remote-publisher-ui.test.mjs` (Opt-in/Widerruf) und `remote-viewer-ui.test.mjs` (separates Gerät/Anzeige). **116 Checks bestanden**.

### Grenzen
- Die eigentlichen Turnierdaten bleiben im Browser der Turnierleitung; nur eine lesende Momentaufnahme wird auf ALL-INKL veröffentlicht. **Keine** gemeinsame Verwaltung oder Ergebniseingabe auf mehreren Geräten.
- Der bestehende HTTP-Passwortschutz gilt vorerst auch für die Fernanzeige. Zuschauer müssen diesen gegebenenfalls am jeweiligen Gerät eingeben. Keine öffentliche Teilnehmer-/Zuschauer-Freigabe implementiert.
- Server benötigt PHP 8.2+ und ein schreibbares PHP-Temp-Verzeichnis. Unterstützung bei ALL-INKL ist grundsätzlich vorhanden, die konkrete Konfiguration dieses Webspaces wurde noch nicht geprüft.
- Browser-/Smart-TV-Gerätetest und echte Produktions-/Datenschutzfreigabe stehen aus.

## [0.6.0] – Live-Ansicht für einen zweiten Monitor

**Stand 2026-11-05:** Im manuellen [GitHub-Actions-FTPS-Lauf 42037542292](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42037542292) erfolgreich auf den geschützten Webspace übertragen. Umfassender Zwei-Monitor-Browsertest nicht belegt. Die separate geräteübergreifende Funktion entsteht erst in v0.6.1.

### Neu
- **Eigene schreibgeschützte `site/live.html`** im TENNILO-Branding: bildschirmfüllende, kontrastreiche TV-/Monitoransicht mit großen Doppel-Spielpaarungen, Platznamen, hervorgehobenen Siegern, eingetragenen Game-Ergebnissen und Schleifchen-Topliste.
- Aktive Runde mit Countdown und Überzeit gemäß der vorhandenen Rundenuhr. Auch die Auffüllrunde mit gekennzeichneten Auffüllern und die Endrunde bis zum Sieger-Doppel lassen sich anzeigen.
- **Live-Monitor öffnen** in der Turnierleitung öffnet die separate Seite in einem weiteren Browserfenster/Tab. Auf einen an denselben Rechner angeschlossenen Monitor ziehen und über „Vollbild“ bildschirmfüllend nutzen.
- Über **„Diese Runde live zeigen“**, **„Endrunde auf Live-Monitor anzeigen“** oder **„Monitor auf Automatik stellen“** kann die Turnierleitung gezielt den angezeigten Turnierteil steuern. Automatik bevorzugt die laufende bzw. zuletzt gestartete Runde, später die Endrunde.
- Änderungen an Spielplan, Ergebnissen oder Anzeigeauswahl aktualisieren die Live-Ansicht über den gemeinsamen Browser-Speicher (`storage`-Ereignis, zusätzlich Prüfung im Sekundenabstand). Der Countdown verändert nur die eingeblendete Uhrzeit, ohne ständig die gesamte Ansicht neu aufzubauen.
- **Datensparsam:** Keine Nenngelder, Barzahlungen, Zahlungskategorien oder Anwesenheitsverwaltung auf der Zuschauerseite. Nutzereingaben werden in der Live-Anzeige als HTML-Text maskiert.
- Manuelle Anzeigeauswahl `liveDisplay` wird im Turnier und JSON-Backup gespeichert, alte Turniere ohne dieses Feld bleiben im Automatikmodus kompatibel.
- Neue Dateien: `site/live.html`, `site/assets/live.css`, `site/assets/live.js`, `site/assets/live-model.js`, `site/assets/live-ui.js`. Der weiter manuell auszulösende FTPS-Workflow prüft alle Tests und lädt ausschließlich 17 freigegebene App-/Monitor-Dateien hoch.

### Prüfung / Grenze
- **98 Logik- und Darstellungsprüfungen + 7 simulierte UI-Tests = 105 erfolgreich**, darunter 14 neue Live-Modelltests, 5 neue Monitor-Darstellungstests und je ein UI-Test für die Live-Steuerung und den zweiten Monitor.
- **Keine Server-Synchronisierung:** Die Anzeige funktioniert nur in weiteren Tabs/Fenstern **desselben Browserprofils auf demselben Rechner**, also beispielsweise bei einem per HDMI/DisplayPort angeschlossenen zweiten Monitor. Ein zweiter Computer/Smart-TV mit eigenem Browser teilt nicht automatisch den Speicher. Diese Ausbaustufe benötigt später ein sicheres Backend.
- Kein öffentlicher Mehrgerätebetrieb, kein echter TV-End-to-End-Test und keine Freigabe für produktive Turniere.

## [0.5.1] – Gemeinsamer Check-in und mehrere Nenngeld-Kategorien

**Stand 2026-11-05:** Am 2026-11-05 per [GitHub-Actions-Lauf 42033283559](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42033283559) erfolgreich hochgeladen. Nutzer-Rückmeldung zur zusammengefassten Anwesenheits-/Nenngeldliste positiv; umfassender Browser- und Praxistest weiterhin offen.

### Änderungen
- **Teilnehmende und Bar-Nenngeld in einer einzigen Liste:** Spieler, Stärkegruppe, Anwesenheit, Tarif, Sollbetrag, tatsächlich erhaltenes Bargeld, offener Betrag und Erfassungsaktionen gemeinsam sichtbar. Separater „Nenngeld“-Navigationspunkt entfernt; bisherige Menü-/Schnellaktionen führen zur vereinten Liste.
- **Frei konfigurierbare Nenngeld-Kategorien** pro Turnier: Name und Eurobetrag (beispielsweise „Jugend“ 5 € und „Erwachsene“ 12 €). Kategorien werden unter Einstellungen hinzugefügt und bearbeitet; bis zu 20 Kategorien einschließlich Standard.
- Pro Teilnehmer kann ein Tarif unmittelbar per Dropdown oder im Bearbeiten-Dialog zugeordnet werden. Stärkegruppe und Nenngeld-Kategorie sind fachlich unabhängig.
- **Datenmigration:** Bestehende Turniere erhalten automatisch eine Kategorie „Standard“ mit ihrem bisher geltenden Nenngeld. Bisherige individuelle Sonderbeträge, Zahlungseingänge, Anwesenheiten und Spielpläne bleiben gespeichert.
- **Betragsschutz:** Bereits tatsächlich erhaltene Barzahlungen ändern sich bei einem Tarifwechsel oder einer Preisänderung nicht automatisch. Das Entfernen einer noch zugewiesenen Kategorie ist untersagt. Ein individueller Sonderbetrag wird beim ausdrücklichen Tarifwechsel nach Bestätigung aufgehoben.
- Die bestehende Rundenuhr und die Schleifchenturnier-Auslosung bleiben unverändert. Es gibt weiterhin keine Onlinezahlung oder geräteübergreifende Synchronisierung.
- Tests: `tests/fee-tiers.test.mjs` (11 neue Logikprüfungen) und `tests/fee-tiers-ui.test.mjs` (gemeinsamer Bedienablauf); **79 Logiktests + 5 simulierte UI-Regressionstests erfolgreich**.

## [0.5.0] – Bar-Nenngeld, Spielzeiten und laufende Rundenuhr

**Stand 2026-11-05:** Version 0.5.0 wurde per manuellem [GitHub-Actions-Lauf 42020751117](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42020751117) erfolgreich getestet und via FTPS hochgeladen. Ein umfassender Browser-/Praxistest ist noch nicht bestätigt.

### Neue Funktionen
- **Nenngeld / Barzahlung:** Standardbetrag in Euro pro Turnier (Voreinstellung 0,00 €); optional individuelles Nenngeld je Spieler, auch kostenfrei. Kein Bezahldienst, keine Onlinezahlung.
- Neuer Bereich „Nenngeld“ mit Kassenliste, Sollbetrag, tatsächlich bar erhaltenem Betrag, offenen Forderungen, Teilzahlungen und sichtbaren Überzahlungen. „Rest bar erhalten“ bestätigt ausschließlich bei tatsächlicher Bargeldübergabe; Zahlungen können im Dialog korrigiert oder auf 0 gesetzt werden.
- Bestehende Barzahlungen bleiben bei späteren Anpassungen des Standardbetrags als Cent-Beträge dokumentiert. Alle angemeldeten Personen erscheinen in der Liste, auch bei Abwesenheit.
- **Spielplan-Zeiten:** Geplante Runden- und Match-Zeiten werden explizit als Start–Ende angezeigt, inklusive Wechselpause/Pausenende und ggf. „+1 Tag“.
- **„Runde starten“:** Live-Sekunden-Countdown gemäß eingestellter Spieldauer; Pausieren, Fortsetzen, Beenden, Zurücksetzen mit Bestätigung. Nach Ablauf roter Überzeit-Zähler statt automatischem Abbruch.
- Zeitstempel und Pausendauer werden pro Runde im Browser gespeichert. Eine aktive Uhr läuft nach Neuladen zeitlich korrekt weiter; es darf nur eine Rundenuhr pro Turnier gleichzeitig laufen.
- Alte Rundenuhren werden bei Neuauslosung gelöscht; bei Rücknahme der Auffüllrunde wird deren Uhr ebenfalls gelöscht.
- Browserdaten- und JSON-Backup-Schema weiterhin Version 1, alte Turniere mit Standard 0,00 € und ohne Uhr kompatibel.
- Neue Module `site/assets/operations.js` und `site/assets/operations-ui.js`. Der manuelle FTPS-Workflow führt weiterhin zuerst alle Tests aus und überträgt anschließend zwölf explizit zugelassene Dateien.

### Tests und Einschränkungen
- **68 Logiktests + 4 simulierte UI-Regressionstests bestanden**, inkl. bisheriger Schleifchen-Endrunde. Neue Dateien `tests/operations.test.mjs` und `tests/operations-ui.test.mjs`.
- **Wichtig:** Die Uhr verwendet die lokale Uhrzeit des jeweiligen Geräts. Noch keine Geräte-Synchronisierung, gemeinsame Server-Uhr, akustische Signale oder Echtzeit-Liveteilnahme über mehrere Geräte. Eine abgelaufene Uhr erzeugt weder Ergebnisse noch Schleifchen.
- Kein umfassender Browser-/Praxistest, keine Freigabe für reale Turniere. Doppelturnier-Entwicklung vorerst zurückgestellt.

## [0.4.0] – Endrunde für Schleifchenturniere (8 oder 16 Spieler)

**Stand 2026-11-05:** v0.4.0 im manuellen [GitHub-Actions-Lauf 42013798677](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42013798677) erfolgreich geprüft und per FTPS übertragen. Der Nutzer berichtet, dass die Endrunde anscheinend funktioniert. **Vollständige Browser-, Turnier- und Sicherheitstests bleiben offen.**

### Neu
- Eigener Bereich **Endrunde**, unabhängig von der vorherigen Schleifchen-Auslosung.
- Aus wahlweise 8 oder 16 Einzelspielern nach Schleifchenzahl, gespielten Partien und Name qualifizieren sich die Besten; Teilnehmer können abgewählt werden, die nächsten Spielbereiten rücken nach.
- Feste Doppel-Teams werden nur einmal ausgelost: zuerst möglichst Stark/Schwächer, bei ungleicher Besetzung verbleibende Spieler innerhalb derselben Gruppe zusammenstellen.
- **8 Spieler:** 2 Halbfinals + 1 Finale. **16 Spieler:** 4 Viertelfinals + 2 Halbfinals + 1 Finale.
- Ergebnisse wie gewohnt mit optionalen Game-Zahlen und ausdrücklich gewähltem Siegerteam; der Gewinner rückt automatisch mit seinem festen Partner auf.
- Sobald ein späterer Gegner durch Ergebniskorrektur wechselt, werden unpassende Folgeergebnisse entfernt. Das Sieger-Doppel wird abschließend hervorgehoben.
- Endrunden-Teilnehmerwahl, Spielstände und Auslosung bleiben im lokalen Turnier/JSON-Backup erhalten; jederzeit „Endrunde zurücknehmen“, ohne Vorrunden-Ergebnisse zu löschen.
- Während einer aktiven Endrunde sind Änderungen an den vorherigen Wertungsspielen gesperrt; Korrekturen erst nach Rücknahme der Endrunde.
- Bei zu wenigen Plätzen erhalten weitere gleichstufige K.-o.-Spiele fortlaufende Spielblocknummern statt stillschweigend zeitgleich demselben Platz zugewiesen zu werden.
- Neue Module `site/assets/finals.js` und `site/assets/finals-ui.js`; manueller FTPS-Upload umfasst ab jetzt neun App-Dateien plus Favicon.
- Automatische Tests in `tests/finals.test.mjs` (14 Fälle) und `tests/finals-ui.test.mjs` (vollständiger Bedienablauf).

### Tests und Grenzen
- **53 Logiktests + 3 simulierte UI-Tests bestanden**, inklusive früherer Auslosungs-, Schleifchen- und Auffüllrunden-Funktionen.
- Deployment bestätigt; erster positiver manueller Funktionseindruck der Endrunde. Umfassende Browser-/Mobiltests und Praxisfreigabe für reale Turniere noch nicht bestätigt.
- Die Endrunde ist kein eigenständiges Doppelturnier-Modul. Online-Synchronisierung und serverseitige Speicherung weiterhin offen.

## [0.3.3] – Auffüllrunde nach Schleifchen-V7

**Im GitHub-Code implementiert; am 2026-11-05 mit [GitHub Actions Run 42008064031](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42008064031) erfolgreich hochgeladen. Nutzer-Rückmeldung: Auffüllrunde scheint zu funktionieren; kein vollständiger Browser-End-to-End-Test belegt.**

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
