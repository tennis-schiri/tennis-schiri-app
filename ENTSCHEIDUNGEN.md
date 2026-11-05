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

**Neue Entscheidung ergänzen:** `E-028 · [Titel]` mit Datum, Anlass, Entscheidung, Begründung, technischen Auswirkungen und offenen Fragen. Änderungen an einer bestehenden Entscheidung ausdrücklich vermerken.

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

## E-017 · Ergebniserfassung und Schleifchen-Zwischenstand (2026-11-05)

- **Quelle:** „Schleifchen-Spielplan“ (Ergebnis 1/2, Sieger), „Schleifchen-Tabelle“ (Spiele, Schleifen, Niederlagen, Quote) und „Schleifchen V7“ im Apps Script der vorhandenen Google-Tabelle.
- **Entscheidung:** Bei jeder regulären Begegnung wird das **Siegerteam ausdrücklich ausgewählt**. Zwei Game-Zahlen sind optional; wenn sie eingetragen werden, müssen beide vorliegen und eine eventuelle höhere Game-Zahl muss zum Sieger passen. Bei Game-Gleichstand ist eine gesonderte Siegerentscheidung erforderlich, nicht eine automatische Unentschieden-Wertung.
- **Wertung:** Jede Person des Siegerteams erhält genau **1 Schleifchen**, jede Person des Verliererteams **1 Niederlage**. Ein als entschieden markiertes Match wird bei beiden Teams als gespielte Partie gezählt. Siegquote = Schleifen / entschiedene Spiele.
- **Rangfolge im Zwischenstand:** Schleifchen absteigend, gespielte Partien absteigend, Name aufsteigend – entsprechend der Vorlage.
- **Speicherung:** Ergebnisse werden im bestehenden `draw.rounds[].matches[].result` abgelegt. Vorhandene Spielpläne ohne Resultate bleiben lesbar. Auch Ergebnisänderung, Rücksetzung und JSON-Export/Import werden unterstützt.
- **Auffüllrunde:** Nach Abschluss aller **normalen** Ergebnisse werden spielberechtigte Auffüllkandidaten mit höchstens einem Schleifchen geprüft. Die konkrete Auffüller-Auslosung und die Wertungsfreiheit ihrer Zusatzeinsätze bleiben dem nächsten Schritt vorbehalten.
- **Technik/Prüfung:** `site/assets/results.js` und `tests/results.test.mjs`. Der manuelle GitHub-Workflow testet `tests/*.test.mjs` vor einem Upload; sechs App-Dateien werden übertragen. Der GitHub-Testlauf und die Live-Version 0.3.1 sind noch nicht bestätigt.
- **Abgrenzung:** Keine vollständige, geräteübergreifende Livetabelle oder finale Rangliste; Browser-Testversion.

## E-018 · Kompakte Ergebnisanzeige nach Speicherung (2026-11-05)

- **Anforderung:** Nach dem Speichern einer Begegnung soll die Eingabezeile verschwinden. Stattdessen steht der Spielstand sichtbar zwischen beiden Teams; der Gewinner soll eindeutig erkennbar sein.
- **Umsetzung v0.3.2:** Für entschiedene Spiele statt des Formulars eine kompakte Ansicht mit optionalem Game-Stand und einer farbigen Sieger-Markierung anzeigen. Wenn keine Games erfasst wurden, keine Zahlen erfinden; Gewinner kennzeichnen und Sieg-Symbol anzeigen.
- **Korrekturen:** „Ergebnis ändern“ öffnet das vorausgefüllte Formular; „Abbrechen“ schließt es, ohne den gespeicherten Wert zu ändern. Eine erneute Speicherung aktualisiert die Schleifchenwertung wie bisher.
- **Speicherung:** Die Bearbeitungsansicht ist ausschließlich temporärer UI-Zustand, nicht Bestandteil des Turnier-JSON. Gespeicherte Ergebnisse bleiben kompatibel und nach Neustart kompakt sichtbar.
- **Technik/Tests:** Anpassungen in `site/assets/app.js` und `styles.css`; Regressionstest `tests/result-ui.test.mjs`. Der bestehende manuelle Workflow prüft automatisch auch diesen Test.
- **Freigabe (aktualisiert):** Version 0.3.2 wurde am 2026-11-05 per [GitHub-Actions-Lauf 42003891468](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42003891468) erfolgreich hochgeladen. Der Nutzer bestätigte die Ergebnisdarstellung anschließend.

## E-019 · Nenngeldverwaltung: zunächst nur Barzahlung (2026-11-05)

- **Entscheidung:** Für TENNILO zunächst ausschließlich Barzahlung des Nenngelds vor Ort vorsehen. Das entspricht dem zunächst angestrebten Ablauf bei Vereinsturnieren.
- **Funktionale Idee:** Nenngeld pro Turnier oder Konkurrenz hinterlegen, bei Teilnehmern den Zahlungsstatus (offen / bar bezahlt) manuell führen und erhaltene sowie offene Beträge übersichtlich anzeigen. Ggf. am Check-in erfassen.
- **Nicht Teil der ersten Ausbaustufe:** Integrierte Überweisung, PayPal, Stripe oder andere Online-Zahlungsabwicklung. Auch keine automatische Zahlungsbestätigung behaupten.
- **Einordnung (aktualisiert 2026-11-05):** Seit Version 0.5.0 im GitHub-Code implementiert: Standard-Nenngeld pro Turnier (anfangs 0,00 €), individueller Spielerbetrag inkl. kostenfrei, manuell erfasste Barzahlung pro Person und Kassenübersicht. Zahlungseingänge werden als tatsächlicher Betrag in Cent gespeichert, auch bei späteren Tarifänderungen. Seit dem erfolgreichen FTPS-Lauf 42020751117 am 2026-11-05 live veröffentlicht, aber noch nicht für echte Turniere freigegeben.
- **Abgrenzung:** Nenngeld der Turnierteilnehmer ist etwas anderes als eine spätere TENNILO-App-Lizenzgebühr.

## E-020 · Auffüllrunde nach den normalen Ergebnissen (2026-11-05)

- **Fachliche Quelle:** „Turniere Verein – Auslosung & Livetabelle“, Apps Script „Schleifchen V7“, insbesondere `drawRibbonSpecialRound_`, `ribbonReadNormalStats_`, `ribbonBuildSpecialMatches_`.
- **Zeitpunkt:** Die Auffüllrunde darf erst entstehen, wenn **jedes** reguläre Vorrundenergebnis mit Siegerteam vorliegt. Davor werden weder Auffüller bestimmt noch ihre Spielstärken ignoriert.
- **Auswahl:** Zusätzliche Auffüller haben ihre reguläre Spielquote bereits erreicht und **0 oder 1 Schleifchen**. Wer als regulärer Spieler für diese letzte Runde vorgesehen ist, kommt nicht als Auffüller infrage. Bevorzugt werden Spieler mit weniger Schleifchen; bei Gleichstand entscheidet eine stabile Reihenfolge.
- **Doppelteams:** Jedes Team enthält eine starke und eine schwächere Person. Jeder Spieler wird in der letzten Runde höchstens einmal eingesetzt, und jede Platznummer höchstens für ein Match.
- **Spielwertung:** Die als Auffüller markierten Teilnehmer dürfen das Doppel gewinnen oder verlieren, doch ihr Zusatzspiel zählt für sie **weder als Wertungsspiel noch als Schleifchen oder Niederlage**. Die anderen beiden regulären Teilnehmer bekommen das ihnen noch fehlende Wertungsspiel samt Ergebnis.
- **Konsistenz:** Normale Ergebnisse werden nach Auslosung der Auffüllrunde gesperrt. Wenn eine Änderung benötigt wird, muss die **Auffüllrunde zunächst zurückgenommen** werden; nur die zusätzliche Runde und ihre Ergebnisse werden dann gelöscht. Die normalen Spielpläne und Ergebnisse bleiben erhalten.
- **Prüfung:** Das gespeicherte `draw.specialRound` enthält Besetzung, Auffüller-Markierungen und einen Ergebnis-Fingerprint der normalen Runden. Eingelesene Backups mit unpassendem Zustand werden nicht als gültige Auslosung behandelt.
- **Testversion v0.3.3:** `site/assets/special.js`, erweiterte `draw.js`/`results.js` und UI. Automatische Tests `tests/special.test.mjs` sowie `tests/special-ui.test.mjs` sind implementiert. Aktueller Simulationsstand: 39 Logiktests und 2 UI-Tests erfolgreich. Noch **keine** Live-Veröffentlichung oder vollständiger Browsertest bestätigt.
- **Testmöglichkeit:** Startseite → „Auffüllrunde testen“ legt ein Beispielturnier mit 5 starken, 5 schwächeren Personen, 3 Wertungsspielen und 3 Plätzen an.
- **Nicht Bestandteil dieses Schritts:** Endrunden-Qualifikation, Halbfinale/Finale und abschließende Gesamtwertung sowie freie manuelle Umbesetzung von Auffüllern. Bei unzureichenden 0-/1-Schleifchen-Kandidaten verhindert die App die Auslosung und zeigt den tatsächlichen Fehlbestand, statt ungültige Spieler zuzuweisen.

## E-021 · Schleifchen-Endrunde mit 8 oder 16 Spielern (2026-11-05)

- **Fachquelle:** Original-Turniertabelle „Turniere Verein – Auslosung & Livetabelle“, insbesondere `getRibbonFinalSelection_`, `syncRibbonFinalSelection_`, `drawRibbonFinals_` und `syncRibbonFinalProgression_`. Unterschiedliche ältere Funktionsdefinitionen im Apps Script beachten.
- **Qualifikation:** Entweder 8 oder 16 Einzelspieler. Rangfolge Schleifchen absteigend, gespielte Partien absteigend, Name aufsteigend. Default: die entsprechend bestplatzierten anwesenden Spieler; explizite Abwahl erlaubt automatische Nachrücker.
- **Voraussetzung:** Sämtliche regulären Ergebnisse und gegebenenfalls die Auffüllrunde müssen abgeschlossen sein. Die Endrunde darf ihre Teilnehmer nicht vorher final festlegen.
- **Doppelpartner:** Aus den qualifizierten Spielern einmalig auslosen, möglichst ein starker und ein schwächerer Teilnehmer je Team. Nach Abdeckung aller möglichen gemischten Paare übrige Personen innerhalb derselben Stärkegruppe zusammenlosen. Keine erneute Partnerauslosung zwischen Viertelfinale, Halbfinale und Finale.
- **K.-o.-Ablauf:** 8 Einzelspieler bilden vier Teams, die zwei Halbfinale und ein Finale bestreiten; 16 bilden acht Teams mit vier Viertelfinalen, zwei Halbfinalen und einem Finale.
- **Fortschreibung:** Gewinnt Team 1/2, rückt das gesamte Team automatisch auf. Verändert sich eine Paarung nach Ergebniskorrektur, werden ungültige Folge-Ergebnisse gelöscht. Der Sieger des Finals ist das Turniersieger-Doppel.
- **Wertungsabgrenzung:** Endrunden-Siege verändern **nicht** die Schleifchenzahl der Vorrunde.
- **Sicherheit:** Bei aktiver Endrunde dürfen Vorrunden-Ergebnisse nicht verändert und die Auffüllrunde nicht einzeln zurückgenommen werden. Dazu zuerst die Endrunde zurücknehmen; ihre Resultate werden entfernt, alle vorherigen Runden bleiben erhalten.
- **Persistenz:** Im Turnier `finalSize` (8/16) und `finalOptOut` (abgewählte Spielerkennungen); in `draw.finals` die K.-o.-Auslosung, Ergebnisse und ein Fingerprint der ursprünglichen Wertung. Alte Turniere bekommen kompatible Standardwerte; JSON-Backup bleibt Schema-Version 1.
- **Tests:** `tests/finals.test.mjs` und `tests/finals-ui.test.mjs`; lokaler Simulationsstand 53 Logik- und 3 UI-Tests erfolgreich. v0.4.0 noch nicht live veröffentlicht und im echten Browser geprüft.
- **Offen:** Eigenständiges Doppelturnier mit festen Teams, One Point Cup, serverseitige Speicherung, Mehrgeräte-Liveansicht und abschließende Praxisfreigabe.

## E-022 · Spielzeiten und echte Rundenuhr (2026-11-05)

- **Fokus:** Zunächst weiter das Schleifchenturnier vervollständigen; eigenständige Doppelturniere und One Point Cup vorerst zurückstellen.
- **Geplante Zeiten:** Jede normale Vorrunde und eine gegebenenfalls notwendige Auffüllrunde erhält aus Turnierstartzeit, konfigurierter Spieldauer und Wechselpause eine geplante Start-/Endzeit und ein Pausenende. Bei Mitternachtsüberschreitung ist der Folgetag kenntlich.
- **Spielplan:** Die geplante Spielzeit erscheint sowohl in der Rundenüberschrift als auch direkt an jeder Platz-Begegnung. Die Uhr ist für alle Matches einer Runde gemeinsam.
- **Rundenuhr:** Jede Runde hat die Aktionen **Runde starten**, **Pausieren**, **Fortsetzen**, **Runde beenden** und nach Sicherheitsbestätigung **Uhr zurücksetzen**. Countdown sekundengenau gemäß der bei Start eingestellten Spieldauer, danach Überzeitanzeige. Nach Zeitablauf läuft die Uhr weiter, bis die Leitung beendet; **keine automatische Ergebniseingabe oder Siegerentscheidung**.
- **Zeitdaten:** Der tatsächliche Start und die pausierte Laufzeit liegen mit Zeitstempel in `roundClocks` pro Turnier. Beim erneuten Laden läuft eine gestartete Uhr auf Basis der Gerätezeit weiter. Keine Serverzeit- oder Mehrgeräte-Synchronisierung vorhanden; ein anderes Gerät ist nicht als gemeinsame Turnieruhr geeignet.
- **Schutz:** Pro Turnier darf nur eine Rundenuhr gleichzeitig laufen. Bei Neuauslosung werden alte Rundenzeiten nach bestehender Bestätigung gelöscht. Bei Rücknahme der Auffüllrunde wird auch deren Rundenuhr gelöscht. Änderungen an der konfigurierten Spieldauer verändern eine bereits gestartete Uhr nicht rückwirkend.
- **Nenngeld:** Gleichzeitig `entryFeeCents`, `feeOverrideCents`, `feePaidCents`, `feePaidAt` eingeführt. Kein Online-Zahlungsdienst; Zahlungseinträge sind ausschließlich manuell bestätigt. Die Kassenübersicht enthält alle angemeldeten Teilnehmer (Anwesenheitsstatus beeinflusst die Forderung nicht). Individuelle Gebührenanpassung und Korrektur auch nach Barzahlung möglich.
- **Datenmigration:** Bestehende Turniere bleiben in Browser-Datenmodell Version 1 lesbar; alte Turniere bekommen 0,00 € Standard-Nenngeld und keine gestarteten Uhren. Barzahlungen und Zeitstempel werden in JSON-Sicherungen aufgenommen.
- **Tests / Version:** `site/assets/operations.js`, `operations-ui.js`, `tests/operations.test.mjs`, `tests/operations-ui.test.mjs`; zusammen mit Altbestand 68 Logiktests und 4 simulierte UI-Tests bestanden. v0.5.0 durch den manuellen FTPS-Workflow im [Run 42020751117](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42020751117) erfolgreich veröffentlicht; ein vollständiger Praxistest steht aus.

## E-023 · Anwesenheit und Bar-Nenngeld gemeinsam, mehrere Tarife (2026-11-05)

- **Entscheidung des Nutzers:** Die bisher getrennten Ansichten „Teilnehmende“ und „Nenngeld“ werden zu einer **einzigen Teilnehmer-/Check-in-Liste** zusammengeführt. Der zusätzliche Nenngeld-Navigationspunkt entfällt. Pro Spieler sind Stärkegruppe, Anwesenheit, Tarif-Kategorie, fälliger Betrag, erhaltenes Bargeld und offener Betrag samt Korrekturaktionen sichtbar.
- **Mehrere Preisstufen:** Nenngeld-Kategorien je Turnier mit frei wählbarem Namen und Betrag, beispielsweise „Jugend“ und „Erwachsene“. Kein fester Rückschluss aus der Stärkegruppe oder dem Alter: Kategorien werden vom Veranstalter zugewiesen. Zusätzliche Kategorien lassen sich unter Einstellungen anlegen, ändern und (solange ungenutzt) entfernen.
- **Datenmodell:** `feeCategories: [{id,name,amountCents}]` pro Turnier und `feeTierId` pro Teilnehmer. Für Altbestand entsteht automatisch die Kategorie `standard` mit dem bisherigen `entryFeeCents`; das bestehende Feld bleibt für das Standard-Nenngeld und ältere Formulare kompatibel. Datenmodell-/JSON-Backup-Version bleibt 1.
- **Sonderfälle:** `feeOverrideCents` bleibt für individuelle Ausnahmen verfügbar, einschließlich 0,00 € für beitragsfrei. Beim bewussten Wechsel der Nenngeld-Kategorie wird ein vorhandener Sonderbetrag nach Rückfrage aufgehoben, damit der gewählte Tarif gilt.
- **Barzahlungsschutz:** `feePaidCents` und ein gegebenenfalls gespeicherter Zahlungszeitpunkt bleiben bei Preis- und Kategorienänderungen erhalten. Zahlung „bar erhalten“ darf nur nach tatsächlicher Übergabe bestätigt werden. Bereits zugewiesene Kategorien können nicht gelöscht werden.
- **Unabhängigkeit:** Anwesenheit wirkt weiterhin auf die Auslosung, nicht automatisch auf die Nenngeldforderung. Auch abwesende angemeldete Personen stehen in der gemeinsamen Check-in-/Kassenliste.
- **Sicherheit:** Kategorie-Namen sind eindeutig (ohne Groß-/Kleinschreibungsunterschied) und maximal 40 Zeichen lang, Preise werden in Cent validiert, maximal 20 Kategorien je Turnier. UI bleibt mobil als horizontal scrollbar angelegte Tabelle bedienbar; keine automatische Synchronisierung zwischen Geräten.
- **Version / Tests:** In GitHub ab v0.5.1, nach erfolgreichen 79 Logik- und 5 simulierten UI-Tests. Version 0.5.1 wurde am 2026-11-05 im manuellen GitHub-Actions-Lauf 42033283559 erfolgreich veröffentlicht; ein umfassender Browsertest ist noch offen.

## E-024 · Schreibgeschützter Live-Monitor im selben Browser (2026-11-05)

- **Anforderung:** Zusätzliche, kontrastreiche Live-Ansicht für einen separaten Monitor während eines Schleifchenturniers. Die Turnierleitung soll weiterhin an der App arbeiten können, Zuschauer sehen Spielplan, Rundenstand, Ergebnisse und Uhr in groß.
- **Vorläufiges Zielgerät:** Zweiter Monitor, der an **denselben Rechner** angeschlossen ist. Die Turnierleitung öffnet `site/live.html?turnier=<Turnier-ID>` über „Live-Monitor öffnen“ in einem weiteren Fenster desselben Browserprofils, zieht dieses Fenster auf den zweiten Monitor und aktiviert dort Vollbild. **Kein** Versprechen für eigenständigen Smart-TV, Zweitrechner, anderes Browserprofil oder Smartphone.
- **Warum diese Beschränkung:** Die App speichert Turniere derzeit ausschließlich in `localStorage`. Andere Fenster desselben Ursprungs im gleichen Browserprofil können diese Daten über `storage`-Ereignisse sehen; unterschiedliche Geräte können es nicht. Ein geräteübergreifendes Live-Portal benötigt später Serverdatenbank, Authentifizierung, Berechtigungen und ein Live-Update-Protokoll.
- **Inhalt der Anzeige:** Aktuelle Runde, Platzbelegung, möglichst groß lesbare Doppel-Teams, Sieger-Markierung und Game-Zahlen, Schleifchen-Zwischenstand, Rundenuhr mit Countdown/Überzeit, Auffüllrunde mit Auffüller-Kennzeichnung und Endrunde bis zum Sieger-Doppel.
- **Steuerung:** Standardmäßig automatische Auswahl der laufenden, sonst zuletzt gestarteten oder nächsten offenen Runde; bei Endrunden-Auslosung K.-o.-Anzeige. Die Leitung kann bewusst eine einzelne Vorrunde/Auffüllrunde oder die Endrunde auf dem Monitor anzeigen; `liveDisplay` wird pro Turnier gespeichert und ins bestehende JSON-Backup übernommen. Erneute normale Auslosung setzt die Auswahl auf Automatik.
- **Aktualisierung:** Zweites Fenster wertet `storage`-Ereignisse aus und prüft zusätzlich jede Sekunde auf veränderte Turnierdaten; nur der Sekundenwert der Uhr wird laufend aktualisiert. Bestehende Turnierlogik und Zahlungen bleiben unberührt.
- **Datenschutz und Sicherheit:** Live-Monitor schreibgeschützt, kein Check-in, kein Kassendialog und keine Nenngeld-/Barzahlungsdaten. Spieler-Namen werden als HTML-Text escaped. Die Seite bleibt unter dem bestehenden geschützten Webspace und erhält `noindex,nofollow`. Eine öffentliche Freigabe oder separates Rollenmodell ist damit **nicht** erreicht.
- **Dateien:** `site/live.html`, `site/assets/live.css`, `site/assets/live.js`, `site/assets/live-model.js`, `site/assets/live-ui.js`; vorhandene App-Steuerung und Speicherung erweitert. Manuell bestätigter FTPS-Workflow mit 17 ausdrücklich erlaubten Dateien; niemals `.htaccess`, `index.htm` oder WordPress ändern.
- **Version und Tests:** v0.6.0 in GitHub; 98 Logik-/Darstellungstests und sieben simulierte UI-Tests bestanden, einschließlich Zwei-Fenster-Speicheraktualisierung. Kein echter Monitor-Browsertest und kein veröffentlichter FTPS-Lauf für v0.6.0 bestätigt.
- **Weiteres Vorgehen:** Erst im zweiten Bildschirm am selben Rechner testen. Wenn später ein **unabhängiges Gerät** verlangt wird, Server-Synchronisierung als eigenes Vorhaben mit Sicherheits-/Datenschutzkonzept umsetzen.
- **Ergänzung v0.6.1 (2026-11-05):** Der Nutzer wünscht gerade **einen eigenständigen Laptop/Smart-TV**. Für die ausschließlich lesende Anzeige wird deshalb ein kurzlebiger PHP-Live-Zwischenspeicher eingeführt (siehe E-025). Vollständige Cloud-Turnierverwaltung und Mehrgeräte-Bearbeitung bleiben späteren Entwicklungsschritten vorbehalten.

## E-025 · Geräteübergreifende Live-Anzeige mit sicherem PHP-Snapshot (2026-11-05)

- **Korrigierte Anforderung:** Eine Zuschaueranzeige nur auf einem zweiten, am selben Rechner angeschlossenen Monitor reicht nicht. Ein **eigenständiger Laptop, Tablet oder Smart-TV** soll den Live-Spielplan öffnen können, ohne gemeinsame Browserdaten mit der Turnierleitung zu haben.
- **Architektur für den nächsten Testschritt:** Auf dem vorhandenen ALL-INKL-Webspace läuft `site/live-feed.php` (PHP 8.2+), der vom Turnierleiter-Browser aktiv mit reinen Zuschauer-Snapshots beschickt wird. Die Monitorseite liest diese über einen eigenen zufälligen Link im Abstand von ungefähr drei Sekunden. Keine MariaDB-Konfiguration nötig und keine eigene zusätzliche Hostingplattform.
- **Freigabe ausdrücklich statt automatisch:** Die Turnierleitung muss pro Turnier auf „Fernanzeige aktivieren“ klicken. Der geteilte Zuschauer-Link enthält einen zufällig erzeugten **192-Bit-Leseschlüssel**, ausschließlich im URL-Fragment. Ein getrennter **192-Bit-Schreibschlüssel** verbleibt im lokalen Browserspeicher der Turnierleitung, nicht im Link, nicht in den Turnierdaten und nicht im JSON-Backup. Mit „Freigabe beenden“ wird die öffentliche Live-Momentaufnahme sofort zurückgenommen. Links laufen ohne neue Veröffentlichung nach höchstens 24 Stunden ab.
- **Datenminimierung:** Server erlaubt nur Runde/Titel, Platznamen, Zweierteams, Ergebnisse/Sieger, Top-10-Schleifchenstand und Rundenuhr. Keine Nenngeld-, Barzahlungs-, Anwesenheitslisten, Kontodaten oder beliebigen Turnier-JSONs. PHP filtert empfangene Daten unabhängig vom JavaScript erneut anhand einer Allowlist. Die gespeicherten Dateien liegen unter `sys_get_temp_dir()` außerhalb des öffentlich erreichbaren Webverzeichnisses.
- **Authentifizierung / Grenzen:** Auf der geschützten Test-App gilt weiterhin derselbe HTTP-Passwortschutz; ein fremdes Gerät muss sich gegebenenfalls dort anmelden. Der Zuschauer-Link ersetzt die Webspace-Anmeldung **nicht**, sondern trennt zusätzlich Leserechte und Schreibrechte. Kein öffentliches Zuschauerportal ohne Konto/Passwort, keine Benutzerrollen, keine gemeinsame Bearbeitung und noch keine zentrale Turnierdatenbank.
- **Zeit-/Stabilitätsmodell:** Nur Spielstands-Snapshots, ca. alle drei Sekunden. Der Server fügt einen Empfangszeitstempel hinzu; der externe Monitor berechnet den Countdown relativ zum Server-Empfang und seiner lokalen vergangenen Zeit, sodass abweichende Geräteuhren den Countdown nicht versetzen. Bei ausbleibender Veröffentlichung erscheint ein Offline-Hinweis, bei widerrufenem Link eine Warteansicht.
- **Upload:** Ein manuelles, weiter durch GitHub Secrets geschütztes FTPS-Deployment überträgt 19 erlaubte Dateien; `.htaccess`, `index.htm` und WordPress bleiben unangetastet. Zusätzlich neuer `verify.yml`-Workflow ohne FTPS-Upload. `deploy.yml` blockiert Upload bei PHP-Syntax-/Versionstest- oder JavaScript-/PHP-Integrationstestfehlern.
- **Nachweis:** [GitHub-Testlauf 42042177880](https://github.com/tennis-schiri/tennis-schiri-app/actions/runs/42042177880) erfolgreich, **116 Tests und PHP-Syntaxprüfung bestanden**. PHP-Endpunkt im lokalen Test-Webserver geprobt. Noch **nicht** auf ALL-INKL getestet, nicht von einem realen Smart-TV geprüft und **nicht** produktiv freigegeben.
- **Nächste Schritte:** v0.6.1 manuell veröffentlichen, PHP-Funktionsfähigkeit/Temp-Verzeichnis prüfen, Zuschauer-Link auf unabhängigem Gerät testen, Verbindungen/Ergebnis-Updates/Widerruf überprüfen. Bei Bedarf später ein rollenbasiertes, dauerhaftes Backend für Mehrgeräte-**Bearbeitung** und eine öffentlich nutzbare, separat geschützte Zuschauer-Domain schaffen.

## E-026 · B0.1: Vereins-/Benutzerkonten und Lizenzmodell vor öffentlicher Registrierung (2026-11-05)

- **Nutzerentscheidung:** TENNILO braucht vor dem öffentlichen Vertrieb ein vollständiges Backend mit Benutzerregistrierung, Vereinskonten, Preisen, Lizenzen und Software-Zahlungen. Als ersten konkreten Schritt **das Datenbank- und Kontomodell** implementieren; Turnierfunktionen nicht gleichzeitig umfassend umbauen.
- **Mandant:** Eine Person kann mehreren Vereinen zugeordnet werden; eine Organisation ist der juristische/vertragliche Lizenzinhaber und Eigentümer ihrer Turniere. Turnierteilnehmer sind keine registrierten Plattformnutzer, solange sie sich nicht bewusst anmelden.
- **Rechte:** `owner` verwaltet Verein, Mitglieder und künftige Lizenz-/Rechnungsdaten; `organizer` verwaltet Turniere und Live-Freigabe; `viewer` darf nur berechtigte Vereins-/Turnierdaten lesen. Zuschauer-Live-Freigabe ist getrennt und erhält keine Administrationsrechte. Globale Administratoren brauchen eine separate explizite Freischaltung.
- **Datenmodell (B0.1 implementiert):** Zwölf MariaDB/MySQL-Tabellen `schema_migrations`, `users`, `organizations`, `organization_memberships`, `organization_invitations`, `email_verification_tokens`, `password_reset_tokens`, `auth_sessions`, `platform_administrators`, `license_plans`, `organization_licenses`, `audit_events`.
- **Sicherheit:** Passwort-Hashing über PHP `password_hash`, zufällige Tokens (256 Bit), Speicherung ausschließlich als SHA-256-Hash, ablaufende Sessions/Einladungen, E-Mail-Eindeutigkeit, Fremdschlüssel und nur ein aktueller Lizenzdatensatz je Verein. Der letzte aktive Vereinsbesitzer darf später nur in einer serverseitig abgesicherten Transaktion mit Ersatz entfernt werden.
- **Hosting:** PHP/PDO und MariaDB/MySQL als Ziel auf ALL-INKL, **konkrete Zugangsdaten/Serverfähigkeit vor Installation prüfen**. Neue Backend-Dateien liegen ausschließlich im Repo-Verzeichnis `backend/` außerhalb des öffentlich ausgelieferten `site/`; die vorhandene FTPS-Action ist absichtlich nicht erweitert.
- **Technische Tests:** PHP-Unit-/Rollenprüfungen, SQL-Strukturregression und echter MariaDB-Integrationstest in temporärer GitHub-Actions-Datenbank; dort niemals Produktiv-Credentials oder echte Kundendaten verwenden.
- **Preis- und Zahlungsentscheidung ausdrücklich offen:** Bisherige Zahlen 14,90 € pro Turnier und 99 €/Jahr sind Ideenvorschläge, **keine verbindlichen Preise**. Zunächst kein Online-Nenngeld: Turnierteilnehmer zahlen beim Verein weiterhin bar. Softwarelizenz-Zahlungen an TENNILO werden später getrennt verarbeitet.
- **Nächster Schritt B0.2:** Server-API für Registrierung mit bestätigter E-Mail, Login/Logout/Passwort-Reset, sichere Sitzungen, Vereine anlegen/erste Besitzerrolle atomar und weitere Organisatoren per Einladungslink. Vor echten Nutzern Datenschutz, Backups/Restore, Rechte-/CSRF-/Rate-Limit-Tests und Produktionskonfiguration sicherstellen.

## E-027 · B0.2: Registrierung und Vereine als gesperrte, testbare API (2026-11-05)

- **Anlass:** Nach B0.1 fordert der Nutzer die Fortsetzung des Backend-Ausbaus. Erste Zielstufe ist ein serverseitiges Benutzersystem mit Vereinen und Rollen. Bestehende Schleifchenturnier-App und Live-Anzeige bleiben unverändert.
- **Implementiert im privaten Backend:** Registration mit Passwort-Hashing und gesperrtem Konto bis zur Mailbestätigung, erneute Bestätigungsmail, Login/Logout, 12-Stunden-Sessions, Passwort-Reset samt Widerruf alter Sitzungen. Verifikation, Session, Reset und Einladung verwenden 256-Bit-Zufallstoken, die ausschließlich gehasht in MariaDB gespeichert werden.
- **Vereine:** Erstbesitzer-Mitgliedschaft und Verein werden in derselben Datenbanktransaktion erstellt; verifizierter Benutzer kann mehreren Vereinen angehören. Besitzer können Organisatoren/Leser einladen, deren Rollenzuweisung ändern und Mitglieder entfernen. Fremde Konten können fremde Einladungstoken nicht annehmen; letzter aktiver Besitzer ist vor Entfernung/Herabstufung geschützt.
- **API-Grenze:** `backend/src/ApiKernel.php` bietet vorbereitete JSON-Routen. Mutationen erfordern exakt erlaubten HTTPS-Origin und für angemeldete Sitzungen einen validen CSRF-Header; Cookies `Secure`, `HttpOnly` (Session), `SameSite=Strict`, Host-Prefix. Persistente Limits durch `RateLimiter` und Migration `002_auth_request_limits.sql` verwenden HMAC-Schlüssel statt Klartext-IP/E-Mail.
- **Betriebsschutz:** `backend/public/index.php` ist ohne `TENNILO_API_ENABLED=1` geschlossen und wird **nicht** vom bisherigen FTPS-Workflow verteilt. Die gesamte Backend-Codebasis wird nicht auf dem produktiven Webroot installiert. PHP-Mailtransport ist nur optional vorbereitet; reale ALL-INKL-Zustellung, Konto-UI, Staging und Datenschutzprüfungen fehlen.
- **Nachweis:** CI prüft Syntax/alte Turnierfunktionen sowie echte Registrierungs-, Vereins- und API-Abläufe gegen temporäre MariaDB. Insbesondere Einmal-Links, CSRF, Rate-Limits, fehlende Rechte, Passwort-Reset, Session-Invalidierung und letzte Besitzerrolle.
- **Nicht Gegenstand der Phase:** Öffentlicher Betrieb, echte Kundenregistrierungen, produktive Datenbank, Spielerdaten-/Turnierimport, Lizenzkäufe, Preise, Zahlungsanbieter oder Online-Nenngeld. Barausgleich des Teilnehmer-Nenngelds beim Verein bleibt bestehen.
- **Nächste Phase:** Konto- und Vereinsoberfläche bauen und Mailzustellung an einer separat gesicherten ALL-INKL-Staging-Umgebung testen; erst nach positiven Sicherheits-/Datenschutz-/Backup-Tests API einschalten. Danach zentrale Turnierverwaltung und später Zahlungssystem.

## E-028 · B0.2 Konto-UI ausschließlich im getrennten Staging (2026-11-05)

- **Weiterentwicklung:** Die bestehenden API-Routen erhalten eine eigene, mobil nutzbare Oberfläche für Registrierung, Anmelden, Einmal-Link-Bestätigung, Passwort-Reset und Vereins-/Mitgliederverwaltung.
- **Sicherheitsgrenze:** UI-Dateien bleiben unter `backend/staging-ui/` im privaten Repository und sind nicht Bestandteil der 19-Dateien-FTPS-Allowlist. Keine automatische Veröffentlichung, keine Aktivierung der standardmäßig gesperrten Konto-API.
- **Integration:** Gleicher HTTPS-Origin und vorhandene serverseitige Session-/Rollen-/CSRF-Prüfung statt clientseitiger Rechtefreigabe. Keine Speicherung von Kennwörtern, Einmal-Tokens oder Sitzungen in LocalStorage.
- **Freigabe offen:** Separate ALL-INKL-Testdatenbank, verifizierbare E-Mail-Zustellung, Browser-/Sicherheits-/Backup-Tests vor Einladung realer Testnutzer. Keine Produktivregistrierung, keine Lizenzzahlung.

## E-029 · Doppelturnier als zweite eigenständige Turnierart (2026-11-05)

- **Nutzerentscheidung:** Staging/Benutzerregistrierung vorerst zurückstellen und direkt die nächste Turnierart entwickeln. Reihenfolge laut E-002: zuerst Schleifchenturnier (bestehend), danach Doppelturnier mit festen Partnern, später One Point Cup.
- **Fachquelle:** Die bestehenden Google-Sheet-Tabs `Doppel-Setup`, `Doppel-Teams`, `Doppel-Auslosung`, `Doppel-Livetabelle`, `Doppel-Play-Offs`, `Doppel-Runden & Zeit` aus „Turniere Verein – Auslosung & Livetabelle“; ursprüngliche Tabelle unverändert.
- **Umsetzung v0.7.0 privat:** Feste Teams aus zwei Spielern, einstellbare Vorrunden-Begegnungen ohne Wiederholung, Spielplan mit freier Platzanzahl, Spielzeit/Wechselpause und Rundenuhr, explicit Sieger + Games/Entscheidungspunkte, teambezogene Rangliste (Siege, Game-Differenz, Games+) und Top-8-Play-offs inkl. Platz 3. Nachrücken bei abgewählten Teams.
- **Bar-Nenngeld:** Je Spieler separat normal/ermäßigt, nur tatsächlich erhaltene Barzahlungen; keine Online-Nenngeld-Abwicklung. Die TENNILO-Lizenzen sind weiterhin ein separates zukünftiges Abrechnungssystem.
- **Speicherung:** Gemeinsames Browser-/JSON-Sicherungsmodell, diskriminiert durch `type: ribbon` bzw. `type: doubles`; keine automatische Migration alter Schleifchen-Ergebnisse.
- **Validierung:** Fachlich unmögliche Spielzahlen (z. B. bei zu wenigen Gegnern oder ungerader Gesamtbegegnungszahl) werden abgewiesen. Ausgeloste Teams/Anwesenheit nur nach Rücknahme der Auslosung ändern. Nachrücker und Ergebnisfortschreibung konsistent.
- **Freigabe:** Eigenständige Seite und vier neue Dateien in **manueller** FTPS-Allowlist; **keine Veröffentlichung**. Zuerst CI-/Browser-/Praxistests, dann ausdrücklich freigeben. Keine allgemeine Mehrgeräte-Bearbeitung und noch keine Doppel-Fernanzeige. Fachkonzept [DOPPEL_KONZEPT.md](DOPPEL_KONZEPT.md).

## E-030 · Gemeinsame Fernanzeige und JSON-Wiederherstellung für Doppelturniere (2026-11-05)

- **Fortsetzung:** Die bestehende Zuschaueransicht wird auch für feste Doppelturniere verwendet. Keine zweite Live-Infrastruktur, keine neue Datenbank und keine öffentliche Registrierung; nur privater GitHub-Code.
- **Freigabe/Widerruf:** Organisator aktiviert PHP-Fernanzeige bewusst, kopiert Link mit 192-Bit-Leseschlüssel und beendet die Übertragung per Widerruf. Separater Schreibschlüssel verbleibt außerhalb des JSON-Backups im lokalen Browser.
- **Zuschaueransicht:** Feste Zweierteams, Games, Sieger, Rundenuhr, Siege/Game-Differenz der Rangliste und Top-8-Play-offs. Die vorhandene Monitorseite unterscheidet format: ribbon und format: doubles.
- **Datenschutz:** Client und PHP erlauben nur öffentliche Anzeigefelder; Nenngelder, Barzahlungen, Anwesenheitslisten und administrative Daten bleiben ausgeschlossen. Bestehender Webspace-Passwortschutz bleibt aktiv.
- **Sicherung:** Doppelturniere können JSON exportieren und importieren. Beim Import wird ausdrücklich vor dem Ersetzen aller Browser-Turniere gewarnt; Dateigrenze 3 MB; Datenmodell-Schema 1 bleibt kompatibel.
- **Tests/Freigabe:** Neue doubles-live.test.mjs, doubles-remote-publisher-ui.test.mjs und erweiterte live-feed.test.mjs. Isolierte Live-Darstellungs- und Freigabefunktionen geprüft; vollständige GitHub-CI, PHP- und echte Zweitgeräte-/Browser-Tests noch nicht bestätigt. **Kein FTPS-Upload ausgelöst**, produktive App bleibt v0.6.1.

## E-031 · Live-Monitor bei vielen Plätzen kompakter, Folgerunde plus Tabelle (2026-11-05)

- **Nutzerwunsch:** Paarungskarten insbesondere bei mehr als vier Plätzen kleiner anzeigen; nächste bereits ausgeloste Runde mit Paarungen anzeigen; die Livetabelle muss stets erhalten bleiben.
- **Darstellung:** Aktuelle Runde links in kompakteren Karten, ab fünf Spielen dichtes Raster. Direkt darunter die kommende Runde als kompakte Platz-/Paarungsliste mit Uhrzeit, sofern sie feststeht. Rechts die unveränderte Livetabelle; auf schmalen Bildschirmen wandert sie unter den Spielplan.
- **Turnierarten:** Gemeinsame Live-Anzeige für Schleifchen und feste Doppel. Vorrunden zeigen die tatsächlich vorhandene nächste Runde; in der K.-o.-Phase nur feststehende nächste Paarungen. Keine vorgetäuschten Begegnungen.
- **Sicherheit:** Nächste Paarungen durch denselben datensparsamen PHP-Allowlist-Filter; keine Nenngelder, Anwesenheitslisten oder vollständige Turnierdateien. Lokal und per Opt-in-Zuschauer-Link.
- **Freigabe:** Nur GitHub-Code, **kein Upload**. Neue Tests für Next-Round, 6-Platz-Raster, Maskierung und PHP-Feldfilter; vollständige CI/Praxistests vor Veröffentlichung offen.
