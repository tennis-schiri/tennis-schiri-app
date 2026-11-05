# TENNILO – Quellen, Turnierformate und Drive-Ablage

**Stand:** 2026-11-05  
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

## Arbeitsregel für neue Turnierformate

1. Passendes Original im Drive-Ordner lesen, inklusive Varianten, Sonderfällen und Auswertung.
2. Fachliche Anforderungen und Abweichungen vom bestehenden TENNILO-Modell in einer eigenen, kurzen Konzeptnotiz festhalten.
3. Regeln mit konkreten Testfällen bestätigen; eine bloße PDF-Titelähnlichkeit ist kein Regelsatz.
4. Separates Auslosungs- oder Wertungsmodul implementieren und automatisiert prüfen.
5. GitHub-Projektstatus, Entscheidungen und Changelog aktualisieren.

**Keine bestehenden Dateien im Drive-Ordner „Turnierformate“ verändern.** Neue TENNILO-Konzeptdokumente in „TENNILO – Dokumentation“ ablegen.
