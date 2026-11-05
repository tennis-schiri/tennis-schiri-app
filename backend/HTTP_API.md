# TENNILO Backend B0.2 – private Konto- und Vereins-API

**Stand: 2026-11-05.** Diese Entwicklung ist **nicht öffentlich freigeschaltet**.
Weder das bisherige Frontend noch der manuelle FTPS-Workflow veröffentlichen `backend/`.
Es wurden keine echten Benutzer oder Vereine bei ALL-INKL erstellt.

## Implementiert im privaten Repository

Die schon geprüfte MariaDB-Basis B0.1 wurde um folgende B0.2-Komponenten ergänzt:

| Datei | Aufgabe |
| --- | --- |
| `src/AuthService.php` | Registrierung (zunächst gesperrt), Mailbestätigung, erneute Bestätigung, Login, Sitzung/CSRF, Logout, Passwort-Reset |
| `src/ClubService.php` | Vereine anlegen und erste Besitzer-Mitgliedschaft atomar speichern, Mitgliedschafts-/Rollenprüfung, Einladung, Annahme, Mitgliederverwaltung, letzter Besitzer geschützt |
| `src/RateLimiter.php` | Datenbankübergreifendes Anfragelimit für Login, Registrierung, Reset, Einladungen und Vereinsanlage, IP-/Kontoschlüssel als HMAC |
| `src/ApiKernel.php` | JSON-API mit Same-Origin-Prüfung, CSRF, TLS-Cookie-Konfiguration und generischen Fehlermeldungen |
| `src/TokenDelivery.php` | Schnittstelle für den einmaligen Mailversand; Roh-Token ausschließlich an Empfänger |
| `src/NativeMailDelivery.php` | Optionaler PHP-`mail()`-Adapter; ungetestet auf ALL-INKL, noch nicht aktiv |
| `public/index.php` | HTTP-Startdatei, **standardmäßig abgeschaltet** und NICHT im Webroot ausgerollt |
| `migrations/002_auth_request_limits.sql` | Serverseitige, dauerhaft gespeicherte Pseudonym-HMAC-Quoten |
| `tests/auth-club-integration.php` | Registrierung, E-Mail-Bestätigung, Rollen, Einladungen, Passwort-Reset und Sitzungsschutz |
| `tests/api-integration.php` | Origin, CSRF, Cookies, REST-Routen, Zugriffsrechte und Rate-Limits |

Eine TAN-/SMS-/Passwortlos-Anmeldung und Abrechnung gehören nicht zu dieser Phase. Eine Einzelturnierlizenz oder eine Jahreslizenz wurde **nicht automatisch vergeben**.

## Vorbereitete JSON-Aktionen

Die private Routing-Adresse wäre nach gesondertem Staging-Deployment beispielsweise
`https://<staging-host>/api/index.php?route=/auth/register`.

| Methode und Route | Funktion |
| --- | --- |
| `POST /auth/register` | Benutzerkonto anlegen, Bestätigungsmail anstoßen |
| `POST /auth/resend-verification` | Bestätigungslink erneut anfordern |
| `POST /auth/verify` | E-Mail anhand einmaligem Token bestätigen |
| `POST /auth/login` | Passwort prüfen, sichere Sitzungs- und CSRF-Cookies setzen |
| `GET /auth/me` | Aktuell angemeldetes Konto anzeigen |
| `POST /auth/logout` | Sitzung widerrufen, Cookies löschen |
| `POST /auth/password/request` | Passwort-Link ohne E-Mail-Existenzoffenlegung anfordern |
| `POST /auth/password/complete` | Passwort ändern; alte Sitzungen widerrufen |
| `GET /clubs` | Eigene Vereine und Rolle anzeigen |
| `POST /clubs` | Verein mit Besitzer-Mitgliedschaft atomar anlegen |
| `GET /clubs/{id}/members` | Mitglieder nur bei passender Vereinsberechtigung lesen |
| `POST /clubs/{id}/invitations` | Organisator oder Leser per E-Mail einladen (nur Besitzer) |
| `POST /invitations/accept` | Einladung einmalig mit passendem bestätigtem Konto annehmen |
| `PATCH /clubs/{id}/members/{userId}` | Mitgliedsrolle als Besitzer ändern |
| `DELETE /clubs/{id}/members/{userId}` | Mitglied entfernen, letzter Besitzer bleibt geschützt |

Die Routen sind **intern geprüft**, aber noch keine fertige nutzbare Browser-Oberfläche. Sie sind **nicht online**.

## Sicherheitsvoraussetzungen für den späteren Staging-Betrieb

- `TENNILO_API_ENABLED=1` **nur nach ausdrücklich geprüfter Staging-Einrichtung**. Ohne diese Variable bleibt die HTTP-Datei geschlossen (503). Kein selbstständiges Ausrollen auf `app.tennis-schiri.de`.
- Ausschließlich HTTPS, exakter erlaubter `TENNILO_APP_ORIGIN`, kein Cross-Origin-CORS. Alle Mutationen prüfen den Origin; Verwaltungsaktionen benötigen einen gültigen CSRF-Header aus der Sitzungs-Cookie-Konfiguration.
- Cookie `__Host-tennilo_session` ist `Secure`, `HttpOnly`, `SameSite=Strict`, Pfad `/`. Das separat gelieferte `__Host-tennilo_csrf` ist für gleichursprüngliche Browser-Skripte lesbar und wird mit dem Header verglichen. Sessions leben 12 Stunden.
- Passwort-Hashing bevorzugt Argon2id; Token sind 256 Bit kryptographisch zufällig und werden in der Datenbank ausschließlich als SHA-256 gespeichert. Passwort-Reset widerruft alle aktiven Sitzungen.
- Persistente Quoten pro Quell-IP, E-Mail und Vereinsbenutzer; die Datenbank enthält nur HMACs, keine Klartext-IP/-E-Mail im Rate-Limit-Schlüssel. `TENNILO_RATE_HMAC_KEY` ist ein separates Server-Secret mit mindestens 32 Bytes.
- `TENNILO_DB_HOST`, `TENNILO_DB_PORT`, `TENNILO_DB_NAME`, `TENNILO_DB_USER`, `TENNILO_DB_PASSWORD` gehören nur auf den Server bzw. in die kurzlebige CI-Testumgebung, niemals in GitHub-Frontend, URL oder Chat.
- Mailversand erfordert `TENNILO_MAIL_FROM` und `TENNILO_PUBLIC_URL`. Die Einmal-Links verweisen auf **noch zu bauende** `konto.html`-Oberflächen; bis diese und die Mailzustellung getestet sind, darf die API nicht aktiviert werden.
- `backend/` muss außerhalb des öffentlichen Webroots installiert werden; selbst wenn später ein eigener API-Einstieg veröffentlicht wird, dürfen `src/`, `migrations/`, `bin/` und `tests/` niemals frei abrufbar sein.
- Bei fehlendem Origin/CSRF, ungültigem Token, gesperrter Mitgliedschaft oder Überschreitung der Quoten verweigert die API den Zugriff. Keine DB-Fehler, Passwort-Hashes oder Roh-Tokens in JSON-Fehlerantworten.
- Benötigt weitere Review: E-Mail-Zustellbarkeit (SPF/DKIM, Bounces), Test-/Produktivtrennung, System-/Audit-Logging ohne Secrets, Formular-UX, Cookie-Path bei Hosting-Unterpfaden, Datensparsamkeit, Datenschutzinformationen und automatisierte Browser-End-to-End-Tests.

## CI-Prüfungen

`.github/workflows/verify.yml` führt weiterhin die alten Turnier-Tests sowie PHP-Syntax, AccountPolicy und die folgenden Integrationsprüfungen gegen die Wegwerf-Datenbank `tennilo_ci_test` aus:

```bash
php backend/bin/migrate.php --apply
php backend/bin/migrate.php --check
php backend/tests/schema-integration.php
php backend/tests/auth-club-integration.php
php backend/tests/api-integration.php
```

Die Migrationen B0.1 und B0.2 sind im Repository versioniert. Die CI-Zugangsdaten sind nur lokal gültige Wegwerfwerte. **Keine produktive ALL-INKL-Datenbank wurde beschrieben.**

## Nächster Schritt

**B0.2 – Staging und Konto-Oberfläche:** Separaten geschützten ALL-INKL-Testbereich samt Datenbankzugang und Mailtransport einrichten und kontrollieren. Danach Login-/Registrierungs-/E-Mail-Bestätigung-/Vereinsseiten entwickeln und die API in Staging testweise aktivieren. Noch keine echte Kundenregistrierung oder Zahlung verarbeiten. Anschließend folgt B0.3: zentrale Turnierdaten/JSON-Import und Mehrgeräte-Verwaltung, bevor Preise, Lizenzen und Checkout produktiv werden.

**Wichtig:** Die bisherigen Schleifchenturnier-Daten liegen weiterhin lokal; die B0.2-Kontodienste verändern sie nicht.
