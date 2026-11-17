# Buffer ↔ GitHub Actions (Tennis-Schiri & TENNILO)

**Status:** Bridge installiert; **nicht** mit Buffer verbunden und **keine Beiträge übertragen**.
Die Nutzung erfolgt ausschließlich manuell über GitHub Actions. Der Standardmodus `check` liest nur Kontodaten.
Der bestehende Web-App-/FTP-Upload wird durch diesen Workflow nicht ausgelöst.

## Erstmalige Einrichtung

1. In [Buffer](https://publish.buffer.com/) anmelden und **Instagram @tennis.schiri und @tennilo.app** als **Professional**-Kanäle verbinden.
   - Für die automatische Veröffentlichung müssen die Kanäle Professional (Business/Creator) sein.
   - Stories ohne native Sticker/Musik/Link können automatisch erscheinen. Mit diesen Elementen stellt Buffer ggf. auf Benachrichtigung um.
2. In Buffer unter **Settings → API** einen **persönlichen API-Key** erstellen. Buffer API funktioniert im Free-Tarif.
   Offizielle Anleitung: https://developers.buffer.com/guides/authentication
3. Im Repository [Settings → Secrets and variables → Actions](https://github.com/tennis-schiri/tennis-schiri-app/settings/secrets/actions)
   einen **Repository secret** mit dem Namen `BUFFER_API_KEY` erstellen.
   **API-Key niemals hier in den Chat, in eine GitHub-Datei oder in ein Issue kopieren.**
4. [Buffer-GitHub-Action](https://github.com/tennis-schiri/tennis-schiri-app/actions/workflows/buffer-social.yml) öffnen,
   **Run workflow** → `modus: check` → **Run workflow**.
   Im Laufprotokoll müssen die Instagram-Kanäle sichtbar sein; es wird **kein Beitrag erstellt**.
5. Erst danach den Testbeitrag planen; `modus: schedule` wählen und alle Felder ausfüllen.

## Felder für „schedule“

| Feld | Beispiel / Bedeutung |
| --- | --- |
| kanal | `tennis.schiri` oder `tennilo.app` |
| format | `story` oder `post` |
| zeit_berlin | `2026-12-28 18:00` (Europa/Berlin, zukünftiger Zeitpunkt) |
| bild_direktlink | **Öffentliche HTTPS-Datei** mit direkter PNG/JPEG/WebP-Antwort |
| caption | Caption für Feed-Beiträge; bei Storys wird sie ignoriert |
| bestaetigen | exakt `JA` – nur dann ist Schreiben erlaubt |

**Wichtig:** Die Datei muss über eine stabile und öffentlich abrufbare Direkt-URL bis zur Veröffentlichung erreichbar bleiben.
`https://drive.google.com/file/d/.../view` ist **kein** geeigneter Bildlink. Geeignet sind z. B.
eigene statische HTTPS-Assets oder Cloudinary-Public-Delivery-URLs.
Offizielle Buffer-Erklärung: https://developers.buffer.com/guides/hosting-media.html

## Sicherheits- und Kostenregeln

- **Keine automatische Übernahme** von Metricool-Terminen. Vor dem Übertragen kontrollieren, dass
  Datum/Konto/Format nicht bereits von Metricool veröffentlicht werden; sonst könnten Duplikate entstehen.
- Der Workflow lehnt einen zweiten Buffer-Post zum identischen Zeitpunkt im gleichen Kanal ab.
  Eine Cross-Provider-Duplikatprüfung gegen Metricool erfolgt nicht automatisch.
- Buffer Free erlaubt aktuell **10 gleichzeitig geplante Beiträge pro Kanal**, danach muss ein Platz frei werden.
  Der Workflow prüft die Buffer-Antwort, erzwingt aber kein Umgehen dieses Limits.
- Kein externer Zeitplan/Cron; GitHub Action wird ausschließlich über den Button **Run workflow** gestartet.
- Nach dem Planen prüfen, dass Buffer **Automatic** anzeigt und nicht **Notify**.
- Google-Kalender und Metricool werden von dieser GitHub Action **nicht verändert**.
- **Kein Webseiten-Upload**: Sie ändert keine Website-Dateien und veröffentlicht keine App.

## Offizielle Technik

- Buffer GraphQL-Endpunkt: `https://api.buffer.com`
- Auth: `Authorization: Bearer <API_KEY>`
- Query: Account / Organization / Instagram Channels
- Mutation: `createPost` mit `customScheduled`, `automatic`, exaktem UTC-Termin
- Instagram-Typ: `metadata.instagram.type=post|story`
- Keine externen Python-Abhängigkeiten; ausschließlich Python 3.12 Standardbibliothek
- Quellcode: [buffer_social.py](./buffer_social.py)

**Nach dem ersten erfolgreichen Test** können wir eine geregelte wöchentliche Übergabe der
freien Buffer-Warteschlangenplätze entwerfen. Bis dahin alle bestehenden Metricool-Termine unverändert lassen.

## Vorbereiteter Story-Test (24. November 2026)

**Status:** Grafik und Eingabewerte vorbereitet, **noch NICHT in Buffer terminiert**.

- Kanal: `@tennis.schiri`
- Format: `story`, ohne Caption und ohne native Instagram-Sticker
- Termin: Dienstag, **24.11.2026, 18:00 Uhr Europe/Berlin**
- Grafik: 1080 × 1920 px, echtes Tennis-Schiri-Logo, Community-Frage „Was macht ein gutes Tennisturnier aus?“
- GitHub-Direktlink (öffentlich): `https://raw.githubusercontent.com/tennis-schiri/tennis-schiri-app/buffer-media/2026-11-24-tennis-schiri-communityfrage.png`
- Google-Drive-Kopie: `https://drive.google.com/file/d/1ZbfMvCidXwWerwH1JVL9G1z5jKs1kjay/view`
- Geplanter Termin in Metricool auf @tennis.schiri: **keiner** (am 17.11.2026 abgeglichen).

### Empfohlene sichere Abfolge

1. [Workflow öffnen](https://github.com/tennis-schiri/tennis-schiri-app/actions/workflows/buffer-social.yml) → **Run workflow**.
2. Standardmodus `preview` **unverändert lassen**. Testbild, Account und Uhrzeit sind vorausgefüllt; `bestaetigen` bleibt leer.
3. Run starten und im Protokoll nach `VORABTEST ERFOLGREICH` suchen. Dieser Schritt lädt nichts zu Buffer hoch.
4. Nur nach erfolgreichem Preview erneut den Workflow starten, diesmal `modus=schedule` und `bestaetigen=JA`.
5. Nach dem Planen in [Buffer Publish](https://publish.buffer.com/) das **automatische** Story-Posting überprüfen. Geplante Veröffentlichung bleibt bis 24.11.2026 offen; erst danach kann der echte Publikationserfolg beurteilt werden.

**Achtung:** Die frei zugängliche Grafik ist bewusst allgemeiner Tennis-Content, kein rein technisches Testmotiv. Sie ist trotzdem nur für einen einmaligen Test vorgesehen. In Metricool bestehende Beiträge nicht ändern.
