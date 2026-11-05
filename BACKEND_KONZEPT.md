# TENNILO – Plattform-Backend, Benutzer, Lizenzierung und Preismodell

**Status: Architektur- und Produktvorschlag, noch keine beschlossenen Preise oder implementierte Backend-Funktionen.**  
**Stand:** 2026-11-05  
**Aktueller Code:** v0.6.1, passwortgeschützte lokale Testanwendung; geräteübergreifende *schreibgeschützte* Fernanzeige in GitHub entwickelt, noch nicht live bestätigt. Bestehende Frontend-/Turnierfunktionen nicht automatisch veröffentlichen.

## 1. Ziel und Abgrenzung

TENNILO wird von einem lokalen Turnier-Tool zu einer **mandantenfähigen Vereins- und Veranstalterplattform** weiterentwickelt.

**Zwei unterschiedliche Geldflüsse strikt trennen:**

- **Teilnehmer-Nenngeld:** Spieler -> Verein/Veranstalter. In der ersten Version weiterhin **nur bar und manuell erfasst**, wie in E-019 vereinbart. Nicht Teil der Software-Abrechnung und grundsätzlich kein Zahlungsanbieter für die Nenngeld-Kasse.
- **TENNILO-Lizenzgebühr:** Verein/Veranstalter -> Betreiber von TENNILO. Hierfür sind Registrierung, Lizenztarif, Zahlungsstatus, Belege/Rechnungen und ggf. externer Zahlungsdienst nötig.

Der derzeitige PHP-Live-Snapshot-Dienst ist **kein vollständiges Backend**: Er speichert keine zentral verwalteten Kundenkonten, Turniere, Mitgliedschaften oder Rechnungen.

## 2. Benutzer und Mandanten

**Personen registrieren sich**, Vereine/Organisationen erwerben die **Lizenzen**. Ein Nutzer kann einem oder mehreren Vereinen angehören.

- Benutzerkonto: E-Mail (bestätigt), Login, gesicherte Passwort-Reset-Strecke, Profil.
- Organisation: Vereinsname, Kontakt, Rechnungsdaten, Lizenzstatus; eine Organisation kann mehrere Turniere verwalten.
- Einladungen mit befristetem Token: Besitzer lädt weitere Organisatoren ein, ohne Passwörter auszutauschen.
- Rechte: **Besitzer** (Rechnungen, Team, Verwaltung), **Organisator** (Turniere und Ergebnisse), **Leser** (nur berechtigte Verwaltungsleseansicht); **Zuschauer** über separaten Link (nur freigegebene Anzeigedaten, keine Kontoverwaltung).
- Plattformadministrator für Support, Freischaltungen, Sperren und ggf. zeitlich befristete Beta-Lizenzen; besonders schützenswerte Aktionen protokollieren.
- Keine automatische Registrierung der Tennis-Teilnehmer erforderlich: Ein Turnierteilnehmer ist zunächst lediglich ein Eintrag im Turnier, **nicht** automatisch ein TENNILO-Benutzer.

## 3. Technisches Zielbild für ALL-INKL

**Vorschlag für erste Ausbaustufe:** bestehendes Frontend + PHP-API + MariaDB/MySQL beim bestehenden ALL-INKL-Webhosting. ALL-INKL bietet PHP und MySQL/MariaDB in den regulären Hostingpaketen; konkrete PHP-Version, Datenbank-/Cron-Umfang und Mailversand müssen im eigenen Paket geprüft werden.

**Fachliche Tabellen/Entitäten:**
`users`, `email_verifications`, `password_resets`, `sessions`, `organizations`,
`organization_memberships`, `invitations`, `plans`, `licenses/subscriptions`,
`billing_customers`, `payment_events`, `invoices`,
`tournaments`, `tournament_settings`, `participants`, `draws`, `matches`,
`results`, `round_clocks`, `entry_fee_categories`, `entry_fee_receipts`,
`live_shares`, `audit_events`.

Die eigentlichen Turniere und Ergebnisse werden künftig **serverseitig als verbindliche Daten** gespeichert. Browser-Speicher wird höchstens zum Cache/offline-Zwischenspeicher, nicht zur einzigen Quelle. Änderungsrechte und Vereinszugehörigkeit werden **auf dem Server** pro Anfrage geprüft (Mandantentrennung). Für gespeicherte Turnierstände Versionierung/konfliktsichere Schreibvorgänge und gegebenenfalls Änderungsprotokoll einplanen.

Sicherheitsgrundlagen: HTTPS, sichere Cookie-Sessions (HttpOnly, Secure, SameSite), CSRF-Schutz, Passwort-Hashing per geeignetem Standard, Rate Limiting, Eingabevalidierung, parametrisierte SQL-Queries, kein Passwort/Klartext-API-Schlüssel im Frontend oder GitHub, Secrets außerhalb des Webroots, minimale Datenfreigabe, Audit-Logs, Backups und Wiederherstellungstest.

**Live-Monitor:** Öffentliche/teilbare Anzeige liest ausschließlich einen **freigegebenen, datensparsamen** Turnier-Livestand. Nenngelder, Anwesenheit, Kontodaten, Rechnungen und Schreibschlüssel niemals im Zuschauer-Payload. Vor Freigabe echter Zuschauer-Zugriffe Datenschutz/Zugriffsmodell prüfen.

**Migrationsweg:** Bestehende `localStorage`-/JSON-Turniere (einschließlich ausgeloster Runden, Barzahlungen und Ergebnissen) mit Vorschau und kontrollierter Import-Funktion einem Verein zuordnen. Keine stillschweigende Löschung oder Veröffentlichung der lokalen Daten. Vor jeder Migration Backup und Rollback-Konzept.

## 4. Lizenzierung und Preismodell (unverbindlicher Startvorschlag)

**Lizenzinhaber ist die Organisation, nicht die einzelne Person.**

| Modell | Indikativer Preis (noch nicht festgelegt) | Umfang |
| --- | ---: | --- |
| Demo | 0 € | Funktionen ohne produktive Vereinsveranstaltung ausprobieren; Testdaten |
| Einzelturnier | ca. 14,90 € / Turnier | Ein echter Turnierbetrieb, inklusive Live-Monitor und Ergebnisverwaltung |
| Verein | ca. 99 € / Jahr | Mehrere Schleifchenturniere und zusätzliche Organisatoren; genaue Limits noch definieren |
| Verband / Veranstalter | Angebot | Mehrere Vereine, zusätzliche Rollen/Berichte und Service nach Bedarf |

**Noch offen:** Bruttopreise/Steuerbehandlung, Testphase, Turnier-/Benutzerlimits, Gültigkeit einer Einzelturnierlizenz, Rückerstattungen, Kulanz, Wechsel des Vereins, Rechnungsstellung und Laufzeit/Kündigung. Preise erst nach Kostenkalkulation und Pilotvereinsfeedback finalisieren. Keine Paywall vor dem Abschluss der grundlegenden Backend- und Datenmigration ohne klaren Übergang für vorhandene Testdaten.

**Lizenzprüfung:** Der Server prüft `organization -> active license -> entitlements` für produktive Funktionen. Die Berechtigung richtet sich nach einem gültigen Status (z. B. Probezeit, aktiv, abgelaufen, gesperrt), **nicht** nach einem Frontend-Schalter oder einem bloßen Zahlungs-Redirect. Kulanzzugang/Manuell-freigeschaltet für Pilotvereine möglich.

## 5. TENNILO-Zahlungsabwicklung

Für Software-Lizenzzahlungen **externen, etablierten Payment Service Provider** mit Hosted Checkout und signierten Server-Webhooks verwenden; **keine Kreditkartendaten selbst speichern**. Als Kandidaten sind Stripe oder Mollie geeignet; beide bieten wiederkehrende Zahlungen, der endgültige Anbieter ist noch offen. Vor Auswahl Zahlungsgebühren, Lastschrift/Karte, Rechnungserstellung, Steuerpflichten und Kundenservice prüfen.

Anforderungen:
- Kunde/Organisation kann zahlungspflichtige Lizenz buchen, wechseln und kündigen.
- Zahlungsbestätigung nur über **geprüfte serverseitige Webhooks**, keine Lizenzfreischaltung allein bei Rückkehr vom Checkout.
- Webhooks idempotent verarbeiten, Ereignisse protokollieren; Fehlschläge, Rückbuchungen, Ausfälle und Zahlungsfrist berücksichtigen.
- Rechnung/Beleg mit korrekten Unternehmens-/Steuerangaben und zugänglicher Rechnungsübersicht; endgültige Regeln fachlich/steuerlich prüfen.
- Für die allererste geschlossene Pilotphase kann eine **manuell vergebene Testlizenz** ohne Zahlungsanbindung genügen; sie schafft die korrekte Lizenzarchitektur, bevor Abos an echte Kunden gehen.

## 6. Arbeitsreihenfolge

1. **v0.6.1 veröffentlichen und unabhängigem Live-Gerät testen** (aktueller bereits entwickelter Stand; noch keine eigenmächtige Veröffentlichung).
2. **Backend-Fundament:** Hosting-Konfiguration, Datenbank, PHP-API, Migrationskonzept, sichere Konfiguration, Backups, Test-/Produktivtrennung. Berechtigungsmodell und Plan-/Lizenzschema von Anfang an berücksichtigen.
3. **Registrierung + Vereine + Rollen:** Bestätigte E-Mail, Login/Reset, Organisation anlegen, Einladung weiterer Organisatoren, serverseitige Berechtigungstests.
4. **Turniere zentral speichern:** CRUD/Auslosungen/Ergebnisse/Rundenuhr/Kasse pro Verein, JSON-Import vorhandener Testturniere, geräteübergreifendes Bearbeiten mit Konfliktschutz und Live-Ausgabe.
5. **Lizenzlogik zuerst, Bezahlvorgänge danach:** Probe-/Pilotzugang, Berechtigungen, manuelle Freischaltung, anschließend PSP-Checkout, Webhooks, Rechnungen, Aboverwaltung.
6. **Praxisbetrieb absichern:** Datenschutztexte/Verträge (inkl. Rollen/Auftragsverarbeitung prüfen), Lösch-/Exportprozesse, Monitoring, Backup-Restore, Rechte-/Sicherheitstests, Freigabe durch Pilotvereine.

## 7. Bewusst nicht automatisch beschlossen

Die genannten Eurobeträge sind **Preisideen**, keine verbindliche Angebotsseite. Noch keine Entscheidung für Stripe/Mollie, endgültige Rechtsform, Steuerfall, konkretes ALL-INKL-Paket oder Go-live. Keine Datenbank in der Produktivumgebung und keine neue Login-/Bezahlseite ohne entsprechende technische und fachliche Prüfung. Die Schleifchenturnier-Funktionen und die Bar-Nenngeld-Entscheidung bleiben bestehen.

**Primäre Projektquellen:** `README.md`, `PROJEKTSTATUS.md`, `ENTSCHEIDUNGEN.md`, `CHANGELOG.md` und der Google-Drive-Projektwegweiser.
