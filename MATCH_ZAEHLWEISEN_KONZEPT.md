# TENNILO – Matches auf Zeit oder auf Punkte

**Stand:** 2026-11-06 · **GitHub-Code:** v0.8.6 (noch nicht als Gesamt-App veröffentlicht) · **Bestätigter App-Upload:** v0.8.4.

## Trennung von Turnierformat und Match-Zählweise

Das **Turnierformat** bestimmt Paarungen, Spielrunden und Tabellen (Schleifchenturnier, feste Doppel, One Point Cup, spätere Formate). Die **Match-Zählweise** ist unabhängig davon:

- **Auf Zeit (Standard und Altbestand):** Pro Partie oder Spielblock gibt es eine vorgegebene Dauer. Danach erfasst die Turnierleitung das Match-Ergebnis und wählt den Sieger wie bisher. Game-Zahlen bleiben verfügbar; beim Doppelturnier können Gleichstände weiterhin über Entscheidungspunkte aufgelöst werden. Pausen, Uhr und geplante Endzeit behalten ihre bisherige Funktion.
- **Auf Punkte:** Die Turnierleitung legt ein **Punktziel von 1 bis 99** fest (typische Beispiele 7, 10 und 21). Gewinner ist das erste Team, das dieses Ziel erreicht. Optional sind **zwei Punkte Vorsprung** vorgeschrieben: 7:0 oder 7:5 sind bei Ziel 7 zulässig, 7:6 reicht nicht; 8:6 oder 9:7 sind bei längerem Spiel zulässig. Ohne diese Option endet das Match beim Punktziel, nicht erst darüber.
- **One Point Cup:** Eigenständige K.-o.-Variante mit genau **einem entscheidenden Punkt**, ohne zusätzliche Zwei-Punkte-Regel. Dieses Sonderformat wird nicht in einen normalen Zeitmodus umgestellt.
- **Weitere Zählweisen** (Matchtiebreak, Satz, verkürzte Sätze, STOPP für alle gleichzeitig) sind fachlich eigenständige Regeln und nicht durch den einfachen Punktmodus vollständig abgebildet.

## Wirkung auf den Turnierablauf

Punktmodus wird bei **Schleifchenturnier und festem Doppel** einschließlich vorhandener Endrunden von der gewählten Turnier-Zählweise gesteuert. Der Sieger wird automatisch aus zwei korrekten Punktzahlen abgeleitet; widersprüchliche, unvollständige und zu niedrige Ergebnisse werden abgewiesen. Tabellen zählen weiterhin Matches und Siege; die beim Doppel angezeigte Differenz ist je nach Modus Game- bzw. Punktedifferenz.

**Zeitbedarf:** Eine Partie bis zu einer festen Punktzahl dauert nicht zuverlässig genau x Minuten. Deshalb verwendet TENNILO in diesem Modus eine feste, lediglich **geschätzte Planungsdauer**; die bisherige garantiefreie Endzeitabschätzung bleibt möglich, eine automatische Verdichtung auf eine verbindliche Endzeit ist aber nicht sachgerecht und wird nicht angeboten. Der Zeitmodus kann Endzeiten wie bisher optional automatisch anpassen.

**Bestandsdaten und Schutz:** Alle gespeicherten alten Turniere bleiben bei `matchMode:"time"`. Die Datenstruktur bleibt rückwärtskompatibel. Nach erfassten Ergebnissen ist ein Wechsel des Punktziels oder der Zählweise nicht erlaubt, bevor die Ergebnisse bewusst zurückgenommen wurden. Die Spiel- und Nenngeld- bzw. Teilnehmerdaten bleiben separat und geschützt.

**Live-Anzeige:** In Schleifchen und Doppel können auch Punktestände angezeigt werden. Die Doppel-Livetabelle unterscheidet Game- von Punktedifferenz. Dreistellige Punktestände werden bei längeren Punktspielen bis 999 auch durch die private PHP-Fernanzeige übertragen. Dies betrifft nur sichtbare Matchwerte, keine Kassen-, Anwesenheits- oder Konto-Daten.

## Nachweisbare Drive-Quellen

- [Rotationswettbewerbe](https://drive.google.com/file/d/1ZkN6bCLMCNusMbUNwpbUxVy_OPtfgJ5e/view): „Rauf und Runter“ nutzt etwa Tiebreaks bis 7/10 Punkte, „Wie ein Profi“ Zeitmatches; „STOPP“ besitzt eine besondere globale Stoppregel, die nicht automatisch übernommen wird.
- [Jeder gegen Jeden](https://drive.google.com/file/d/1XmxC21CPF7UBANC4laGFXjtlMDZE2eIA/view): Gruppen und unterschiedliche kurze Satz-/Tiebreak-Formate.
- [8 gegen 8 Doppel und weitere Teamformate](https://drive.google.com/file/d/1-VWCPpZ4xS5LyKBYXQrReqj9G_IIdtBE/view): Matches bis 5 Punkte, **aber** besondere Mannschaftswertung nach Gegnernummern. Punktstand ist dort nicht automatisch gleich Mannschaftspunkte.
- [Anleitung zur Ergebniserfassung](https://drive.google.com/file/d/1u4mYHajdIpSyrITw9YDW-kwsWJrTwq0w/view): Alternative Satz-/Tiebreak-Zählweisen als mögliche separate TENNILO-Erweiterungen.
- [Bestehende Vereins-Auslosungstabelle](https://docs.google.com/spreadsheets/d/1aNwzYXmHhpONZURtufkDg6qZHX1-ywOYgyRd_u_LHCY/edit): Maßgeblich für bereits etablierte Schleifchen-/Doppel-/OPC-Auslosungen; keine Veränderung des Originals.

## Roadmap und Release-Grenze

Der Punkt **„Matches auf Zeit oder auf Punkte“** steht als `score-modes` im offiziellen `site/roadmap-seed.json` unter **„Code fertig“** und ist mit Quellen verknüpft. Durch den Roadmap-only-Workflow wird die geschützte Website bei entsprechenden Seed-Änderungen nach erfolgreichem Test aktualisiert; die eigentliche **App bleibt bis zu ausdrücklicher Freigabe ausschließlich im GitHub-Code**.

**Für zukünftige Projektänderungen:** Status, Details, Voraussetzungen und passende Quelllinks in `site/roadmap-seed.json` zusammen mit App-Änderungen bearbeiten. `.github/workflows/roadmap-sync.yml` prüft und überträgt automatisch nur die sechs Roadmap-Dateien. `.github/workflows/deploy.yml` bleibt der manuelle Release der ganzen App.

**Offen:** Echte Browser- und ALL-INKL-Praxistests der Zeit-/Punktspiele, verschiedene Teilnehmerzahlen/Plätze und die separate Prüfung der doppelseitigen Live-Anzeige. Keine allgemeine SaaS-/Produktiv-Freigabe.
