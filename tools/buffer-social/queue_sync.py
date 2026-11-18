#!/usr/bin/env python3
"""Reconcile approved Instagram Story slots into free Buffer queues.

Only stories whose original Metricool posts were explicitly moved to draft
and marked enabled/source_disabled in the manifest are allowed to schedule.
Safe to re-run: existing Buffer queue slots (channel, date) are recognized.
"""
import datetime as dt
import json
import os
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

from buffer_social import gql, organizations, channels, get_scheduled_posts, verify_media_url, parse_buffer_time, qstr

MAX_QUEUE_PER_CHANNEL = 10
MAX_NEW_POSTS_PER_RUN = 18
BERLIN = ZoneInfo("Europe/Berlin")


def due_utc(local):
    d = dt.datetime.strptime(local, "%Y-%m-%d %H:%M").replace(tzinfo=BERLIN)
    return d.astimezone(dt.timezone.utc)


def build_post(channel_id, due, media_urls, kind='story', caption=''):
    # Matches the tested createPost mutation, including Instagram Story metadata.
    if kind not in {'post','story'}: raise ValueError('Ungültiger Instagram-Typ')
    if not isinstance(media_urls, list) or not media_urls: raise ValueError('Kein Bildmaterial')
    if kind == 'story' and len(media_urls) != 1: raise ValueError('Story erwartet ein einzelnes Bild')
    assets = '[' + ','.join('{ image: { url: '+qstr(u)+' } }' for u in media_urls) + ']'
    stamp = due.isoformat(timespec="milliseconds").replace("+00:00","Z")
    return (
        "mutation { createPost(input: {"
        f" text: {qstr(caption if kind == 'post' else '')},"
        f" channelId: {qstr(channel_id)},"
        " schedulingType: automatic, mode: customScheduled,"
        f" dueAt: {qstr(stamp)},"
        f" assets: {assets},"
        f" metadata: {{instagram: {{type: {kind}, shouldShareToFeed: {'true' if kind == 'post' else 'false'} }}}}"
        "}) { ... on PostActionSuccess { post { id dueAt text } } "
        "... on MutationError { message } } }"
    )


def main():
    manifest = json.loads(Path(__file__).with_name("stories-2026.json").read_text(encoding="utf-8"))
    stories = manifest["stories"] + manifest.get("extra_posts", [])
    now = dt.datetime.now(dt.timezone.utc)
    eligible = [x for x in stories
                if x.get("enabled") is True and x.get("source_disabled") is True
                and due_utc(x["date_berlin"]) >= now + dt.timedelta(minutes=35)]
    if not eligible:
        print("Keine freigegebenen zukünftigen Storys zur Übertragung. Kein Post angelegt.")
        return

    by_channel = {}
    for post in eligible:
        if post["channel"] not in {"tennis.schiri","tennilo.app"}:
            raise ValueError("Unbekanntes Instagram-Konto im Manifest.")
        by_channel.setdefault(post["channel"], []).append(post)

    orgs = organizations()
    found = {}
    for org in orgs:
        for c in channels(org["id"]):
            if str(c.get("service","")).lower() != "instagram":
                continue
            handle = str(c.get("name") or "").lower().lstrip("@")
            if handle in by_channel:
                if handle in found: raise RuntimeError("Instagram-Kanal doppelt in Buffer gefunden.")
                found[handle] = (org["id"],c)
    if set(found) != set(by_channel):
        raise RuntimeError("Nicht alle zu übertragenden Instagram-Kanäle in Buffer gefunden.")

    dry = os.environ.get("PREVIEW_ONLY","true").strip().lower() != "false"
    total_new = 0
    failures = []
    for handle in sorted(by_channel):
        org_id, channel = found[handle]
        if channel.get("isQueuePaused"):
            raise RuntimeError(f"Buffer-Kanal {handle} ist pausiert.")
        current = get_scheduled_posts(org_id,channel["id"])
        occupied = {parse_buffer_time(x["dueAt"]) for x in current if x.get("dueAt")}
        available = max(0, MAX_QUEUE_PER_CHANNEL-len(current))
        queue = sorted(by_channel[handle],key=lambda p: p["date_berlin"])
        candidates = [x for x in queue if due_utc(x["date_berlin"]) not in occupied]
        print(f"@{handle}: {len(current)} in Buffer geplant, {available} freie Plätze, "
              f"{len(candidates)} freigegebene zukünftige Storys.")
        if available == 0: continue
        # Hard-stop instead of silently clipping when Buffer's queue query is odd.
        if len(current) > MAX_QUEUE_PER_CHANNEL:
            raise RuntimeError("Buffer-Warteschlange enthält mehr als das erwartete Free-Limit.")
        for post in candidates[:available]:
            if total_new >= MAX_NEW_POSTS_PER_RUN:
                break
            date = due_utc(post["date_berlin"])
            if dry:
                print(f"  VORSCHAU {post['date_berlin']}: {post['media_url']}")
                continue
            try:
                images = post.get("media_urls") or [post["media_url"]]
                for img in images: verify_media_url(img)
                response = gql(build_post(channel["id"],date,images,post.get("kind","story"),post.get("caption","")))
                result = response.get("createPost") or {}
                if result.get("message"):
                    raise RuntimeError(result["message"])
                created = result.get("post")
                if not created or not created.get("id"):
                    raise RuntimeError("Kein Buffer Post-ID in Antwort.")
                occupied.add(date)
                total_new += 1
                print(f"  GEPLANT {post['date_berlin']} Buffer-ID {created['id']}; "
                      f"Metricool-UUID {post['source_metricool_uuid']}")
            except Exception as exc:
                failures.append(f"@{handle} {post['date_berlin']}: {exc}")
                print("  FEHLER "+failures[-1],file=sys.stderr)
                # Do not proceed past a failed item; preserve publication order.
                break
    if dry: print("VORABTEST BEENDET: Keine Buffer-Beiträge angelegt.")
    else: print(f"BUFFER-SYNC: {total_new} neue Instagram-Storys geplant.")
    if failures:
        raise RuntimeError(f"{len(failures)} Stories konnten nicht geplant werden; siehe obige Fehlermeldungen.")


if __name__ == "__main__":
    try:main()
    except (ValueError,RuntimeError) as e:
        print(f"FEHLER: {e}",file=sys.stderr)
        sys.exit(1)
