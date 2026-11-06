# TENNILO – Turnierberater / Formatfinder

**Stand:** 2026-11-06 · **GitHub-Code:** v0.8.3 (noch nicht online) · **Live:** v0.8.0.

## Ziel

Die Turnierleitung kann mit wenigen Eckdaten eine **begründete Empfehlung für geeignete Turnierarten** erhalten. Bei zukünftigen Formaten soll die Vergleichsansicht ohne grundlegende Umbauten erweiterbar sein.

Einstieg auf der TENNILO-Startseite: **„Welches Turnier passt zu euch?“** / **„Turnierberater starten“**. Alternativ bleiben die bisherigen direkten Neuanlage-Wege bestehen.

## Eingaben

- Teilnehmende insgesamt (4–128); Anzahl verfügbare Plätze (1–24).
- Datum, verpflichtende Startzeit, **optionale Endzeit**. Ohne Endzeit wird mit festen Standard-Spieldauern gerechnet, mit Endzeit wird der bereits vorhandene Modus `fit` verwendet.
- Vorrangiges Ziel: viele Spiele, Abwechslung, sportlicher Wettbewerb, kurzer Ablauf.
- Partnerwunsch: offen, wechselnde Doppelpartner, feste Doppel-Teams oder Einzel/K.-o.-Format.

## Rechen- und Empfehlungsmodell

Die Datei `site/assets/tournament-advisor.js` enthält ein Formatregister `FORMAT_ADVISORS`. Jeder Adapter liefert nach identischen Eingaben und unter transparenten Annahmen eine berechenbare Planung mit Spielblöcken, Begegnungen, ungefährer Endzeit, Matchanzahl pro Spieler/Team und benötigten Konfigurationswerten. Die Empfehlung sortiert **zuerst nach Machbarkeit**, danach nach Passung von Turnierziel und Partnerwunsch. Alle drei Formate erscheinen; unpassende/unmögliche Formate haben eine Begründung.

- **Schleifchen:** Die bestehende Fachauslosung `generateRibbonDraw` wird auf anonymen Modellspielern mit ungefähr gleich großen Stärkegruppen ausgeführt. Getestet werden 4 oder 3 Wertungsspiele je Person. Eine erwartete Auffüllrunde wird zusätzlich im Zeitbudget berücksichtigt. Aktuelle Grenze im Berater: bis 80 Personen; die eigentliche Schleifchen-App kann mehr.
- **Feste Doppel:** Anonyme Zweierteams werden gebildet; nur gerade Teilnehmerzahlen lassen sich so vollständig abbilden. Der bestehende `doublesMatchOptions`-Check prüft 1–8 Matches je Team mit echten Probeauslosungen und Platz-/Zeitbedarf. Der Zielkonflikt wird über einen Vorschlagswert (2, 4 oder 5 Matches je Team, sofern machbar) aufgelöst. Bei Wettbewerb und mindestens 8 Teams wird die Top-8-Endrunde zeitlich berücksichtigt.
- **One Point Cup:** Feldgröße ist die nächste Zweierpotenz bis maximal 64, Freilose werden nicht als Matches gerechnet; `onePointTimePlan` bewertet die echte Anzahl nacheinander benötigter K.-o.-Zeitblöcke und parallel nutzbarer Plätze.
- **Zeitplanung:** Gemeinsame `timeWindow`- und `tournamentSchedule`-Regeln aus `operations.js`. Zu knappe Zeitfenster werden abgelehnt; Spielminuten werden nicht unter die zugelassenen Grenzen reduziert. Endzeiten sind unverbindliche Planungswerte; tatsächliche Spiele können länger dauern.

Die Modellspieler werden **nur im Arbeitsspeicher zur Prüfung** erzeugt. Keine echten Namen, Nenngelder oder geheime Live-Links gehen in die Empfehlungen ein.

## Aus Empfehlung wird ein Turnier

Nach dem Vergleich erstellt **„Diesen Vorschlag als Turnier anlegen“** einen echten lokalen Datensatz in der bestehenden Speicherung. Übernommen werden: Turnierart, Datum, Start-/Endzeit, Platzanzahl, Zeitmodus und formatbezogene Parameter wie Anzahl Spiele pro Team bzw. K.-o.-Feldgröße. Die Teilnehmer-/Teamliste bleibt **leer**: Annahmen des Beraters werden nicht als reale Anmeldungen gespeichert. Danach öffnet TENNILO die bisherige Turnierverwaltung; reale Teilnehmer, Nenngeldkategorien und die Auslosung bleiben Sache der Turnierleitung.

**Keine automatische Veröffentlichung:** Der bereits bestehende manuelle FTPS-Workflow enthält zusätzlich die neue Beratungsdatei (28 statt 27 Dateien). Das Konto-/Vereinsbackend bleibt unberührt.

## Qualitätsgrenzen und nächste Schritte

- Empfehlung bedeutet **„mit Modellannahmen planbar“**, nicht garantierte Turnierdurchführung: Spieldauer, Spielstärken, Check-in und tatsächliche Teams können abweichen.
- Ohne individuelle Spielstärkeverteilung ist das Schleifchen-Ergebnis besonders vorläufig. Bei ungerader Personenzahl muss Doppelteam-Zuordnung geklärt sein.
- Neue Turnierarten benötigen einen zusätzlichen Formatadapter, passende Wertungs-/Auslosungslogik und eine unterstützte Neuanlage-/Speicherroute; die Ranking- und Vergleichsansicht kann bestehen bleiben.
- Tests: `tests/tournament-advisor.test.mjs` und `tests/tournament-advisor-ui.test.mjs`; isolierte Laufzeitprüfungen im JS-Kontext wurden durchgeführt. Vollständiger GitHub-CI- und echter Browser-Test für v0.8.3 stehen noch aus.
