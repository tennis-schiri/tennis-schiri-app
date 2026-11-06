# TENNILO – Quellen, Turnierformate und Drive-Ablage

**Stand:** 2026-11-06  
**Status:** Quellenverzeichnis – keine neue Produktfunktion und keine automatische Übernahme fremder Spielregeln.

## Ablageorte

- **Drive-Projektordner:** https://drive.google.com/drive/folders/1wasNarP_HEA4o0zqGLlBumfzObEytnjl
- **TENNILO – Dokumentation (Unterordner):** https://drive.google.com/drive/folders/1w6WBQH0o5MEwnKn3ZuuN43HiHaxvMnBg
- **Google-Doc-Wegweiser:** https://docs.google.com/document/d/1d9Gx6AahC1RbEVFtavmo4Y8UAU7_R6EzmmiWQ5mlZr8/edit
- **Turnierformate (bereits vorhandene Bibliothek):** https://drive.google.com/drive/folders/1aPuhuzKZvif5RnfXXVcJsGCkRL6wepfs
- **Technischer Projektstand:** [PROJEKTSTATUS.md](PROJEKTSTATUS.md), [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md), [CHANGELOG.md](CHANGELOG.md)

**Aufgabenteilung:** GitHub ist die führende Quelle für Code, technische Entscheidungen und Versionen. Drive wird für fachliche Quellen, Vorlagen, Turnierformate und verständliche Abstimmungsdokumente verwendet. Keine parallelen, unabhängig gepflegten Versionstabellen anlegen.

## Maßgebliche Quelle für Schleifchenturnier

Die bisher entwickelte Auslosung in TENNILO orientiert sich an der bestehenden [Google-Tabelle „Turniere Verein – Auslosung & Livetabelle“](https://docs.google.com/spreadsheets/d/1aNwzYXmHhpONZURtufkDg6qZHX1-ywOYgyRd_u_LHCY/edit), insbesondere dem Apps Script in Tab „Script“, Zelle A4. Die Schleifchen-V7-Variante ist die jüngste definierte Variante; frühere Definitionen mit identischen Funktionsnamen stehen ebenfalls in der Datei.

**Wichtig:** Die PDF-Rotationswettbewerbe im Drive-Ordner sind nicht automatisch identisch mit unserem Schleifchenturnier. Nicht stillschweigend Regeln daraus in den bestehenden Auslosungsalgorithmus übernehmen.

## Maßgebliche Quelle für Doppelturnier v0.7.0

Die zweite TENNILO-Turnierart beruht auf derselben [Vereins-Tabelle „Turniere Verein – Auslosung & Livetabelle“](https://docs.google.com/spreadsheets/d/1aNwzYXmHhpONZURtufkDg6qZHX1-ywOYgyRd_u_LHCY/edit), insbesondere auf `Doppel-Setup`, `Doppel-Teams`, `Doppel-Auslosung`, `Doppel-Livetabelle`, `Doppel-Play-Offs` und `Doppel-Runden & Zeit`. Dies ist ein Turnier mit **festen Zweierteams**, nicht der in der Bibliothek ebenfalls enthaltene Rotationsmodus **Doppel-Tausch**. Die Regeln und bewussten Implementierungsgrenzen sind im [DOPPEL_KONZEPT.md](DOPPEL_KONZEPT.md) dokumentiert. Das Original-Sheet bleibt unverändert.

## Maßgebliche Quelle für One Point Cup v0.8.0

Die dritte TENNILO-Turnierart basiert auf den Reitern `OPC-Spieler` und `One Point Cup` derselben [Vereins-Tabelle „Turniere Verein – Auslosung & Livetabelle“](https://docs.google.com/spreadsheets/d/1aNwzYXmHhpONZURtufkDg6qZHX1-ywOYgyRd_u_LHCY/edit). Die Vorlage sieht maximal 64 Spieler, ein Standard-32er-Feld, Anwesenheit, Übernahme aus Schleifchen-/Doppel-Listen und ein K.-o.-Tableau mit jeweils einer Siegerentscheidung pro Ballwechsel vor. Abweichungen (zusätzliche Feldgrößen/Freilose und separates lokales Bar-Nenngeld) sind in [ONE_POINT_KONZEPT.md](ONE_POINT_KONZEPT.md) beschrieben. Das Quell-Sheet wurde nicht bearbeitet.

## Turnierformat-Bibliothek – thematische Orientierung

### 1. Rotationsformate

- [Überblick Rotationsformate](https://drive.google.com/file/d/1ZkN6bCLMCNusMbUNwpbUxVy_OPtfgJ5e/view) – u. a. Doppel-Tausch, Rauf und Runter, Stopp, Wie ein Profi.
- [Doppel-Tausch](https://drive.google.com/file/d/19sdU-px7HN-pBQTp77g56eZPYTeEFCwh/view) – Doppelpartnerwechsel und individuelle Wertung gewonnener Spiele.
- [Rauf und Runter](https://drive.google.com/file/d/1hD4tdEwMELqHjIwhrC7OFQMMO09rBuH1/view) – Auf-/Abstieg zwischen Plätzen nach Sieg und Niederlage.

### 2. Ausscheidungsformate

- [Überblick Ausscheidungsformate](https://drive.google.com/file/d/1VKhXDATj0iBajnLNo6IbVkufg-kmuoDT/view)
- [K.-o.-System](https://drive.google.com/file/d/12WcYknw_ddXcISME9x04imB-YEm33G-T/view)
- [K.-o.-System mit Trostrunde](https://drive.google.com/file/d/1D70Fj2n37lSwDQXNWTzxzPqP2-H6_mW7/view)
- [Kompass-Ziehung](https://drive.google.com/file/d/1aaGe29Wr6C0LQ94367szPcwpHmNowlcY/view)

### 3. Gruppen-/Ranglistenformate

- [Überblick Gruppenwettbewerbe](https://drive.google.com/file/d/1-G0cWZi1AmqV6h413yNHg1f9vyWoHI-j/view)
- [Jeder gegen Jeden](https://drive.google.com/file/d/1XmxC21CPF7UBANC4laGFXjtlMDZE2eIA/view)
- [Leitersystem](https://drive.google.com/file/d/1XCNol1SVZQTXhBkzJ0PBmQ54nqqnzB1r/view)
- [Pyramide](https://drive.google.com/file/d/1GpJsjHLuTXJ1tDWvdXVMSpFptznGYN-3/view)

### 4. Team- und Herausforderungsformate

- [Überblick Teamformate](https://drive.google.com/file/d/1-VWCPpZ4xS5LyKBYXQrReqj9G_IIdtBE/view)
- [Überblick Herausforderungsformate](https://drive.google.com/file/d/1Lz6KQfyALjRKbHPPokYypoOqHkaFxdOB/view)

### 5. Excel-Vorlagen zur Ergebniserfassung

- [Anleitung Ergebniserfassung Turnierformate](https://drive.google.com/file/d/1u4mYHajdIpSyrITw9YDW-kwsWJrTwq0w/view)
- [Jeder gegen jeden – 1 Gewinnsatz / 2 Matchpunkte](https://docs.google.com/spreadsheets/d/13Dwd6vEdDzhwjnoS50nqwdVlcZl9tjOd/edit)
- [Jeder gegen jeden – 2 Gewinnsätze](https://docs.google.com/spreadsheets/d/1rF0MhvoG1TKvFoVr5WKAa9sKBT9gVGbQ/edit)
- [K.-o.-System – Vorlage](https://docs.google.com/spreadsheets/d/1XZQxanQv5GbLideDIhA0e46dpsajqrni/edit)
- [K.-o.-System mit Trostrunde – Vorlage](https://docs.google.com/spreadsheets/d/1B2Xidb6DxJrNmyvR8x3II2Y5TE7Mt7Vx/edit)

Die Bibliothek enthält darüber hinaus weitere Einzel-PDFs und Excel-Varianten. Dieses Verzeichnis ist bewusst eine **thematische Auswahl**, keine vollständige Dateiliste.

## Neu verifiziert am 6. November 2026: Matchdauer vs. Punktziel

Die Inhalte der über Google Drive gelesenen PDF-Vorlagen bestätigen, dass **Zählweise** und **Turnierformat** unabhängig voneinander sind. Das ist für die TENNILO-Auswahl **„Matches auf Zeit oder auf Punkte“** entscheidend.

- Im [Rotations-Überblick](https://drive.google.com/file/d/1ZkN6bCLMCNusMbUNwpbUxVy_OPtfgJ5e/view) empfiehlt „Rauf und Runter“ **Tiebreaks bis 7 oder 10 Punkte**. „Wie ein Profi“ beschreibt dagegen **3-Minuten-Matches**. „STOPP“ ist ein eigenständiges Sonderformat: Sobald ein Match z. B. 5 Punkte erreicht, enden **alle parallelen Matches**, deren führendes Team dann gewertet wird. Diese globale STOPP-Logik ist ausdrücklich *nicht* dasselbe wie normale Einzelmatches bis zum Punktziel.
- Der [Überblick Jeder gegen Jeden](https://drive.google.com/file/d/1XmxC21CPF7UBANC4laGFXjtlMDZE2eIA/view) beschreibt typischerweise Gruppen aus 4–5 Personen und empfiehlt **kurze Sätze mit Tiebreak bis 4**, bei jüngeren Teilnehmern reine Tiebreaks. Punkte, Games, gewonnene Sätze und Siege sind dabei unterschiedliche Werte.
- In den [Mannschaftsformaten](https://drive.google.com/file/d/1-VWCPpZ4xS5LyKBYXQrReqj9G_IIdtBE/view) spielt „8 gegen 8 Doppel“ einzelne Matches **bis 5 Punkte**, die Mannschafts-Wertung erfolgt aber **nach den Nummern der besiegten Gegner** – die Matchpunkte dürfen deshalb nicht automatisch als Mannschaftspunkte addiert werden.
- Die [Anleitung Ergebniserfassung](https://drive.google.com/file/d/1u4mYHajdIpSyrITw9YDW-kwsWJrTwq0w/view) lässt alternative Zählweisen wie Matchtiebreaks, lange Sätze oder verkürzte Sätze ausdrücklich zu. Diese komplexeren Varianten bleiben **eigene spätere Fachmodule** und werden nicht unbemerkt in einfache Punktspiele umgedeutet.

**Konsequenz für v0.8.6:** Für die vorhandenen Schleifchen- und festen Doppelturniere gibt es zunächst **Zeitspiel** (bisherige Game-/Siegererfassung) und **Punktspiel bis zu einem Ziel von 1–99 Punkten**, optional mit zwei Punkten Vorsprung. Der Gewinner wird bei Punktspielen aus beiden Punktzahlen automatisch berechnet. Die voraussichtliche Matchdauer ist dann nur eine Schätzung; eine feste Endzeit kann nicht exakt garantiert werden. **One Point Cup** bleibt definitionsgemäß ein einzelner Entscheidungspunkt. Diese Regel ist eine TENNILO-Basisfunktion, **keine pauschale Umsetzung** aller PDF-Sonderformate.

**Neue Roadmap-Kandidaten aus verifizierten Drive-Vorlagen:** Jeder gegen jeden, K.-o.-System mit Trostrunde, Rauf und Runter, STOPP, 8 gegen 8 und Ranglisten-/Leitersystem. Im offiziellen Roadmap-Seed sind sie als Ideen mit klaren offenen Regeln und referenzierten Quellen geführt. Die Originale im Drive bleiben unverändert.

## Arbeitsregel für neue Turnierformate

1. Passendes Original im Drive-Ordner lesen, inklusive Varianten, Sonderfällen und Auswertung.
2. Fachliche Anforderungen und Abweichungen vom bestehenden TENNILO-Modell in einer eigenen, kurzen Konzeptnotiz festhalten.
3. Regeln mit konkreten Testfällen bestätigen; eine bloße PDF-Titelähnlichkeit ist kein Regelsatz.
4. Separates Auslosungs- oder Wertungsmodul implementieren und automatisiert prüfen.
5. GitHub-Projektstatus, Entscheidungen, Changelog **und die offizielle Roadmap-Seed-Datei** aktualisieren. Bei Änderungen an der Roadmap veröffentlicht der getrennte Prüfworkflow nur die geschützte Roadmap. App-Versionen werden weiterhin ausschließlich nach Freigabe manuell hochgeladen.

**Keine bestehenden Dateien im Drive-Ordner „Turnierformate“ verändern.** Neue TENNILO-Konzeptdokumente in „TENNILO – Dokumentation“ ablegen.
