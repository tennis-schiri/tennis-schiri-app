# TENNILO B0.2 – Konto-Oberfläche für separates Staging

**Status: Quellcode im privaten GitHub-Repository, kein Deployment, keine aktive Registrierung.**

Die Seite `konto.html` ist ein isolierter, responsiver deutscher Prototyp im TENNILO-Farbschema (Petrol, Orange, Limettengrün). Er verwendet die bereits implementierte B0.2-API, ersetzt aber **nicht** die bestehende Turnier-App. Die App-Version 0.6.1 bleibt unabhängig davon.

## Enthalten

- Registrierung, Bestätigung der E-Mail über Einmal-Link, erneutes Anfordern der Bestätigung
- Anmeldung/Abmeldung, Passwort-Reset mit Einmal-Link
- Vereinsübersicht, Verein anlegen und auswählen, eigene Mitglieder anzeigen
- Einladung von Organisatoren oder Lesern, Einladungsannahme, Rollenänderungen und Entfernen anderer Mitglieder durch Besitzer
- Gleicher HTTPS-Origin für die API; serverseitige Session-Cookies, CSRF-Header aus gleichursprünglichem Cookie
- Der Token aus dem E-Mail-Link wird aus der Adresszeile entfernt, bevor API-Aufrufe erfolgen. Keine Passwörter, Token oder Mitgliedsdaten in LocalStorage/SessionStorage
- Benutzer- und Mitgliederdaten werden ausschließlich mit `textContent` dargestellt, nicht als HTML interpretiert
- Kein kostenpflichtiger Tarif, keine Buchung, keine Turnier-/Kassendatenmigration

## Staging-Verzeichnisstruktur (Plan, **noch nicht ausgeführt**)

Nur auf einer **separat gesicherten HTTPS-Test-Domain** könnten die vier Dateien später so bereitgestellt werden:

```
<staging-document-root>/
  konto.html
  konto.css
  konto.mjs
  konto-client.mjs
  api/index.php       # ausschließlich abgesicherter HTTP-Einstiegspunkt
```

Der PHP-Backend-Code (insbesondere `src/`, `migrations/`, `bin/` und `tests/`) liegt **außerhalb** des Webroots. Die Datei `backend/public/index.php` wird nur separat und ausdrücklich für den gesicherten Testbereich installiert. **Nicht** das gesamte `backend/`-Verzeichnis in den Webroot kopieren.

`TENNILO_PUBLIC_URL` muss später auf die Staging-Basisadresse zeigen, damit Bestätigungs-/Reset-/Einladungslinks `/konto.html#...` erreichen. `TENNILO_APP_ORIGIN` muss exakt zum HTTPS-Origin passen. Der Endpoint wird von der UI relativ als `./api/index.php?route=...` aufgerufen. Bei der Installation dürfen die Dateipfade, Cookie-Pfade und der Same-Origin-Schutz nicht beliebig abweichen. Die `__Host-`-Cookies benötigen HTTPS und Pfad `/`.

## Noch offen vor einer Testfreigabe

1. Konkrete ALL-INKL-Fähigkeiten prüfen: PHP 8.2+, PDO-MySQL, privat speicherbare Konfiguration, E-Mail-Versand, geschützter Staging-Webroot, Backups/Restore.
2. Separate Testdatenbank und sichere Mail-Konfiguration aufbauen, ohne Zugangsdaten in GitHub oder Chat zu übertragen.
3. Sicherheitsreview und echte Browser-End-to-End-Tests für Anmeldung, Cookies/CSRF, Rollen, Einmal-Links und Zurücksetzen. Auch abgelaufene/ungültige Tokens prüfen.
4. Erst nach Freigabe das Staging gesichert aktivieren; niemals selbstständig an `app.tennis-schiri.de` ausrollen. Die derzeitige API bleibt mit `TENNILO_API_ENABLED` standardmäßig gesperrt.

Die Seite ist noch **kein** Beleg für getestete E-Mail-Zustellung oder ein produktives Benutzerportal.

## Prüfungen

```bash
node --test tests/account-staging-ui.test.mjs
node --test tests/*.test.mjs
```

Das manuelle `.github/workflows/deploy.yml` hat eine feste Allowlist für die 19 alten App-Dateien und enthält **keine** der vier `backend/staging-ui/`-Dateien. Der Workflow wurde nicht geändert. Weitere API- und Sicherheitsdetails: [HTTP_API.md](../HTTP_API.md).
