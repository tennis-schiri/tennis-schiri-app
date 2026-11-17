#!/usr/bin/env python3
"""Buffer GraphQL bridge for Tennis-Schiri / TENNILO (manual GitHub Action only).

Default action CHECK is read-only. Scheduling requires an explicit approval input.
Uses only Python's standard library. No GitHub token or Buffer key is logged.
"""
import datetime as dt
import ipaddress
import json
import os
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

API = "https://api.buffer.com"
TIMEZONE = ZoneInfo("Europe/Berlin")
ALLOWED_CHANNELS = {"tennis.schiri", "tennilo.app"}


def required_env(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"{name} fehlt. Bitte GitHub Secret/Eingabe prüfen.")
    return value


def gql(query):
    key = required_env("BUFFER_API_KEY")
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": query}).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            result = json.loads(response.read(1_000_000).decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Buffer API HTTP {exc.code}. Schlüssel und Kontoberechtigungen prüfen.") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Buffer API nicht erreichbar: {exc.reason}") from exc
    if result.get("errors"):
        errors = [e.get("message", "Unbekannter GraphQL-Fehler") for e in result["errors"]]
        raise RuntimeError("Buffer GraphQL: " + " / ".join(errors))
    if not isinstance(result.get("data"), dict):
        raise RuntimeError("Buffer lieferte keine GraphQL-Daten.")
    return result["data"]


def qstr(value):
    """Safe GraphQL string literal, rather than interpolating unescaped input."""
    return json.dumps(value, ensure_ascii=False)


def organizations():
    result = gql("query { account { organizations { id name } } }")
    orgs = (result.get("account") or {}).get("organizations") or []
    if not orgs:
        raise RuntimeError("Keine Buffer-Organisation gefunden. Buffer-Konto prüfen.")
    return orgs


def channels(org_id):
    query = f"query {{ channels(input: {{organizationId: {qstr(org_id)}}}) {{ id name displayName service isQueuePaused }} }}"
    return gql(query).get("channels") or []


def select_channel(all_channels, requested):
    name = requested.lower().lstrip("@")
    if name not in ALLOWED_CHANNELS:
        raise ValueError("Erlaubte Instagram-Kanäle: tennis.schiri oder tennilo.app")
    matches = []
    for channel in all_channels:
        candidates = {
            str(channel.get("name") or "").lower().lstrip("@"),
            str(channel.get("displayName") or "").lower().lstrip("@"),
        }
        if name in candidates and str(channel.get("service", "")).lower() == "instagram":
            matches.append(channel)
    if len(matches) != 1:
        raise RuntimeError(
            f"Instagram-Kanal @{name} nicht eindeutig gefunden "
            f"({len(matches)} Treffer). In Buffer korrekt verbinden."
        )
    if matches[0].get("isQueuePaused"):
        raise RuntimeError(f"Buffer-Warteschlange für @{name} ist pausiert.")
    return matches[0]


def local_to_utc(local):
    try:
        date = dt.datetime.strptime(local, "%Y-%m-%d %H:%M")
    except ValueError as exc:
        raise ValueError("Datum als YYYY-MM-DD HH:MM in Berliner Ortszeit angeben.") from exc
    localized = date.replace(tzinfo=TIMEZONE)
    utc = localized.astimezone(dt.timezone.utc)
    if utc.astimezone(TIMEZONE).replace(tzinfo=None) != date:
        raise ValueError("Diese Ortszeit existiert wegen einer Zeitumstellung nicht.")
    if utc <= dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=15):
        raise ValueError("Termin muss mindestens 15 Minuten in der Zukunft liegen.")
    return utc.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def verify_media_url(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Bild benötigt einen öffentlichen direkten HTTPS-Link.")
    hostname = parsed.hostname.lower()
    if hostname in {"drive.google.com", "docs.google.com", "github.com", "localhost"} or hostname.endswith(".local"):
        raise ValueError("Keine Google-Drive-Vorschau, GitHub-Dateiansicht oder lokale Adresse: direkten Bildlink verwenden.")
    # Never fetch private/internal IP space from a GitHub runner.
    for result in socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM):
        addr = ipaddress.ip_address(result[4][0])
        if not addr.is_global:
            raise ValueError("Bildhost muss eine öffentliche Internet-Adresse haben.")
    # Buffer needs a stable public image URL, not a short-lived signed link.
    if any(marker in parsed.query.lower() for marker in ("x-amz-signature", "x-goog-signature", "expires=", "sig=")):
        raise ValueError("Signierter/ablaufender Bildlink ist für Buffer ungeeignet.")
    req = urllib.request.Request(url, headers={"User-Agent": "Tennis-Schiri-Buffer-Check/1.0", "Range": "bytes=0-16383"})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            ctype = response.headers.get("Content-Type", "").split(";")[0].lower()
            final = urllib.parse.urlparse(response.url)
            if final.scheme != "https":
                raise ValueError("Bildlink wurde auf unsichere URL umgeleitet.")
            if ctype not in {"image/png", "image/jpeg", "image/webp"}:
                raise ValueError(f"Link liefert kein direktes PNG/JPEG/WebP, sondern {ctype or 'unbekannt'}.")
            response.read(16)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Bild nicht öffentlich abrufbar: HTTP {exc.code}") from exc
    print("Bildlink öffentlich abrufbar (Direktdatei).", flush=True)


def get_scheduled_posts(org_id, channel_id):
    """Collect scheduled posts to block accidental duplicate time slots."""
    items = []
    cursor = None
    for _ in range(10):
        after = f", after: {qstr(cursor)}" if cursor else ""
        query = (
            f"query {{ posts(first: 100{after}, input: {{organizationId: {qstr(org_id)}, "
            f"filter: {{ status: [scheduled], channelIds: [{qstr(channel_id)}] }} }}) "
            "{ edges { node { id dueAt channelId text } } pageInfo { hasNextPage endCursor } } }"
        )
        page = gql(query).get("posts") or {}
        items.extend(edge["node"] for edge in page.get("edges") or [] if edge.get("node"))
        page_info = page.get("pageInfo") or {}
        if not page_info.get("hasNextPage"):
            return items
        cursor = page_info.get("endCursor")
        if not cursor:
            raise RuntimeError("Buffer-Warteschlange konnte nicht vollständig gelesen werden.")
    raise RuntimeError("Buffer-Warteschlange zu groß: Sicherheitsprüfung unvollständig.")


def parse_buffer_time(value):
    return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(dt.timezone.utc)


def main():
    mode = os.environ.get("MODE", "check").lower().strip()
    if mode not in {"check", "preview", "schedule"}:
        raise ValueError("MODE muss check, preview oder schedule sein.")

    orgs = organizations()
    if mode == "check":
        print("Buffer-Verbindung erfolgreich. Gefundene Instagram-Kanäle:")
        found = 0
        for org in orgs:
            for channel in channels(org["id"]):
                if str(channel.get("service", "")).lower() == "instagram":
                    found += 1
                    print(
                        f"  Organisation: {org['name']} | "
                        f"Name: {channel.get('name')} | "
                        f"Anzeigename: {channel.get('displayName')} | "
                        f"ID: {channel['id']} | "
                        f"pausiert: {channel.get('isQueuePaused')}"
                    )
        if not found:
            raise RuntimeError("Noch kein Instagram-Kanal in Buffer verbunden.")
        print("READ-ONLY-TEST OK. Kein Post angelegt oder veröffentlicht.")
        return

    if mode == "schedule" and os.environ.get("CONFIRM", "").strip() != "JA":
        raise ValueError("Terminierung nur mit CONFIRM=JA. Andernfalls keine Änderung.")
    handle = required_env("CHANNEL").lower().lstrip("@")
    kind = required_env("POST_TYPE").lower()
    if kind not in {"story", "post"}:
        raise ValueError("POST_TYPE muss 'story' oder 'post' sein.")
    media_url = required_env("MEDIA_URL")
    caption = os.environ.get("CAPTION", "").strip()
    if kind == "post" and not caption:
        raise ValueError("Feed-Post benötigt eine Caption.")
    if kind == "story":
        caption = ""  # native Instagram story captions cannot auto-publish
    due_at = local_to_utc(required_env("DATE_BERLIN"))
    verify_media_url(media_url)

    results = []
    for org in orgs:
        for c in channels(org["id"]):
            if str(c.get("service", "")).lower() == "instagram":
                results.append((org, c))
    channel = select_channel([c for _, c in results], handle)
    org_id = next(org["id"] for org, c in results if c["id"] == channel["id"])

    scheduled = get_scheduled_posts(org_id, channel["id"])
    requested_time = parse_buffer_time(due_at)
    if any(
        p.get("dueAt") and parse_buffer_time(p["dueAt"]) == requested_time
        for p in scheduled
    ):
        raise RuntimeError("Zu dieser Uhrzeit liegt bereits ein Buffer-Post auf diesem Kanal. Abbruch.")
    print(
        f"Planung: @{handle}, {kind}, {os.environ['DATE_BERLIN']} Europe/Berlin. "
        f"{len(scheduled)} aktuell bei Buffer geplante Posts.",
        flush=True,
    )
    if mode == "preview":
        print("VORABTEST ERFOLGREICH: Bild, Kanal und Termin sind vorbereitet.")
        print("Kein Buffer-Post erstellt. Bitte vor echtem Schedule Metricool-Kollisionen prüfen.")
        return
    # The provided timestamp must NOT also be scheduled at Metricool;
    # cross-provider duplicate checking isn't available from this workflow.
    query = (
        "mutation { createPost(input: {"
        f" text: {qstr(caption)},"
        f" channelId: {qstr(channel['id'])},"
        " schedulingType: automatic, mode: customScheduled,"
        f" dueAt: {qstr(due_at)},"
        f" assets: [{{ image: {{ url: {qstr(media_url)} }} }}],"
        f" metadata: {{instagram: {{type: {kind}, shouldShareToFeed: {'true' if kind == 'post' else 'false'} }} }}"
        "}) { ... on PostActionSuccess { post { id dueAt text } } "
        "... on MutationError { message } } }"
    )
    data = gql(query).get("createPost") or {}
    if data.get("message"):
        raise RuntimeError("Buffer verweigert das Planen: " + data["message"])
    post = data.get("post")
    if not post or not post.get("id"):
        raise RuntimeError("Buffer meldete keinen bestätigten Post. Bitte Buffer-Warteschlange prüfen.")
    print(f"ERFOLG: Buffer-Post {post['id']} geplant für {post.get('dueAt')}.")
    print("Bitte in Buffer kontrollieren: 'Automatic', nicht 'Notify'.")
    print("Metricool-Post erst nach bestätigter Übernahme entfernen.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, urllib.error.URLError, TimeoutError) as error:
        print(f"FEHLER: {error}", file=sys.stderr)
        sys.exit(1)
