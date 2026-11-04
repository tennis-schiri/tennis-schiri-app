# Tennis-Schiri · Turniermanager

Private Entwicklungsablage für die Web-App unter https://app.tennis-schiri.de.

## Stand
- `site/index.html`: responsive Startseite (Platzhalter, noch kein fertiger Turniermanager).
- Geplant: Schleifchenturnier, Doppelturnier, One Point Cup.
- Hosting: ALL-INKL Privat mit SSL-Erweiterung; separates App-Verzeichnis.
- Die bestehende WordPress-Seite unter tennis-schiri.de darf beim Deployment nicht verändert werden.

## Nächste Schritte
1. Separaten FTP-Zugang in ALL-INKL anlegen, dessen Zugriff auf den Ordner der Subdomain begrenzt ist.
2. Verschlüsseltes **FTPS (explizites TLS)** für die Verbindung verwenden. SFTP/SSH gehört nicht zum Tarif Privat.
3. Zugangsdaten nur als verschlüsselte GitHub-Actions-Secrets hinterlegen, niemals im Repository.
4. Deployment-Workflow zunächst nur manuell und mit Pfad-Prüfung aktivieren.
5. Testaufruf der Website und Verzeichnisschutz vor/nach Deployment überprüfen.

## Deployment-Sicherheitsprinzipien
- Nur Inhalt aus `site/` deployen.
- Nie das WordPress-Verzeichnis berühren.
- Nie auf dem Server synchronisierend löschen oder `.htaccess` überschreiben.
- Keine automatischen Deployments, bevor der Zielpfad eindeutig verifiziert wurde.
- Produktionspasswörter und Datenbank-Zugangsdaten niemals in Git speichern.
