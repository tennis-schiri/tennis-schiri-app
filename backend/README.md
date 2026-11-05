# TENNILO – Backend Phase B0.1 (Datenbank- und Kontomodell)

**Stand:** 2026-11-05  
**Status:** In GitHub implementierte private Backend-Grundlage, **nicht produktiv installiert**.  
**Keine öffentliche Registrierung, Anmeldung, Zahlungsabwicklung oder Migration bestehender Turniere aktiv.**

## Enthalten

| Baustein | Stand |
| --- | --- |
| `migrations/001_accounts_organizations.sql` | 12 MariaDB/MySQL-Tabellen inklusive Integritätsregeln |
| `src/AccountPolicy.php` | Validierung, Passwort-Hashing, 256-Bit-Token/Hash, Rollen, Lizenzzeitraum |
| `src/Database.php` | PDO-Anbindung mit extern bereitgestellten Umgebungsvariablen |
| `bin/migrate.php` | **Nur CLI**, keine Webroute; Installation nur mit `--apply` und zusätzlicher Freigabe |
| `tests/account-policy-test.php` | 12 Unit-Tests ohne Datenbank |
| `tests/schema-integration.php` | Datenbankintegration, **nur gegen `tennilo_ci_test`** |
| `../tests/backend-schema.test.mjs` | Statische Prüfung von Tabellen, Mandantentrennung und FTPS-Schutz |

Die GitHub-**Prüf**-Action verwendet eine temporäre MariaDB (`mariadb:11.4`). Sie darf kein produktives Passwort erhalten und installiert das Schema nur in der Wegwerf-DB. Die bisherige **FTPS-Veröffentlichung** enthält ausdrücklich **keine** Dateien aus `backend/`.

## Datenmodell

- **`users`** – persönliche Logins (E-Mail eindeutig, Passwort nur als Hash, Bestätigungsstatus); kein Login für jeden Turnierspieler erforderlich.
- **`organizations`** – die Organisation ist Eigentümer von Turnieren und später Vertrags-/Lizenzpartner.
- **`organization_memberships`** – mehrere Nutzer je Verein und mehrere Vereine je Nutzer; Rollen `owner`, `organizer`, `viewer`.
- **`organization_invitations`** – zeitlich befristete, widerrufbare Einladung; das Token wird ausschließlich gehasht gespeichert.
- **`email_verification_tokens`, `password_reset_tokens`, `auth_sessions`** – jeweils zeitlich befristet; nur SHA-256-Hashes, niemals Klartext-Tokens in der Datenbank.
- **`platform_administrators`** – nur gesondert freigeschaltete globale Administrationskonten, **nicht** das gleiche wie Vereinsbesitzer.
- **`license_plans`, `organization_licenses`** – künftiger Lizenzkatalog und ein aktuell gültiger Lizenzplatz je Organisation. **Keine Preise und keine Abos hinterlegt.**
- **`audit_events`** – späteres Protokoll relevanter Verwaltungs- und Lizenzaktionen.
- **`schema_migrations`** – installierte Migrationen samt SHA-256-Prüfsumme.

Es gibt absichtlich noch **keine zentralen `tournaments`-/`matches`-Tabellen** und **keine `invoices`-/`payments`-Tabellen**. Diese sollen auf das stabile Vereins-/Kontomodell folgen.

## Rechte (serverseitig verbindlich zu prüfen)

| Aktion | Besitzer | Organisator | Leser |
| --- | :---: | :---: | :---: |
| Verein und Mitglieder ansehen | ✓ | ✓ | ✓ |
| Turniere lesen | ✓ | ✓ | ✓ |
| Turniere/Ergebnisse bearbeiten | ✓ | ✓ | – |
| Live-Ansicht veröffentlichen | ✓ | ✓ | – |
| Mitglieder einladen/entfernen | ✓ | – | – |
| Vereins- und Rechnungsdaten verwalten | ✓ | – | – |

Jeder spätere API-Request muss den **authentifizierten Benutzer**, **E-Mail-Bestätigung**, aktiven **Verein**, **Mitgliedschaft** und den konkreten **Verein im Request** überprüfen. Nur Frontend-Schalter oder vom Browser gelieferte Rollen sind niemals ausreichend. Entfernen oder Herabstufen des letzten aktiven Vereinsbesitzers muss unter Datenbanksperre/Transaktion verhindert werden. Die bisherigen PHP-Policy-Methoden sind die reine fachliche Grundlage, keine bereits freigegebene REST-API.

## Lokale und CI-Prüfungen

PHP 8.2+ sowie PDO MySQL sind für die Datenbankphase vorgesehen. Ohne DB lassen sich die PHP-Regeln und SQL-Struktur testen:

```bash
for file in backend/src/*.php backend/bin/*.php backend/tests/*.php; do php -l "$file"; done
php backend/tests/account-policy-test.php
node --test tests/backend-schema.test.mjs
```

GitHub Actions `.github/workflows/verify.yml` führt zusätzlich einen echten Installationstest mit temporärer MariaDB und den Integritätsprüfungen aus. Die Ausführung erfordert **keine echte ALL-INKL-Datenbank und keine Produktiv-Zugangsdaten**.

## Installation auf einem separaten ALL-INKL-Testsystem – später

1. PHP-Version, `pdo_mysql`, private Serververzeichnisse, Datenbankzugang und ggf. SSH/CLI im konkreten Hostingtarif prüfen.
2. **Eigene Testdatenbank** anlegen, sichere Zugangsdaten nur in der Serverumgebung halten; nicht in GitHub, Browser, Chat oder `site/` schreiben.
3. `backend/` **außerhalb des öffentlich erreichbaren Webroots** installieren. Die aktuelle FTPS-Action macht das bewusst nicht.
4. Nach Backup und geprüfter Konfiguration mit CLI:
   ```bash
   TENNILO_DB_HOST=... TENNILO_DB_PORT=3306 TENNILO_DB_NAME=... \
   TENNILO_DB_USER=... TENNILO_DB_PASSWORD=... \
   TENNILO_DB_ALLOW_MIGRATE=1 php backend/bin/migrate.php --apply
   ```
   Danach ohne Freigabevariable mit `--check` kontrollieren. Die Platzhalterwerte nicht mit echten Zugangsdaten in ein Skript oder Terminalprotokoll kopieren. **Auf keinem Fall** den CLI-Migrator als Web-URL bereitstellen.
5. MySQL/MariaDB-DDL ist nicht vollständig transaktional. Für Installationen und Änderungen zwingend vorher Backup/Restore-Möglichkeit sicherstellen. Ein nicht vollständig durchgelaufener Schritt ist manuell zu prüfen.
6. Vor echtem Nutzerzugang: Registrierungs- und Bestätigungsmails, Session-/CSRF-Schutz, Rate Limits, Rechteprüfung/Transaktionen, Backup-Restore, Datenschutz sowie Monitoring und getrennte Test-/Produktivumgebungen umsetzen.

## Nächste Backend-Phase (B0.2)

- Private REST-API für **Registrierung mit E-Mail-Bestätigung**, Login, Logout und Passwort-Reset.
- Vereine anlegen und aktive Eigentümer-Mitgliedschaft **atomar** erstellen.
- Einladung weiterer Organisatoren, serverseitige Rollenkontrolle, Last-Owner-Schutz.
- Keine automatische Lizenzfreigabe durch einen Browser-Redirect.
- Nach erfolgreicher Konto-/Rollenphase zentrale Turniere und Import bestehender JSON-Sicherungen entwickeln; **erst danach** Zahlungsanbieter, Rechnungen und Preistabelle finalisieren.

**Nenngelder bleiben unabhängig von TENNILO-Lizenzen**: Für die erste Ausbaustufe werden sie weiter nur bar beim Verein erfasst. Produktpreise aus `BACKEND_KONZEPT.md` bleiben unverbindliche Entwürfe.
