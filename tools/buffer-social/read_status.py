#!/usr/bin/env python3
"""Read-only Buffer status report; never schedules or modifies posts."""
import datetime as dt
import json
from pathlib import Path
from buffer_social import gql, organizations, channels, qstr, parse_buffer_time, TIMEZONE
from refill_stories import verify_image

def read_posts(org, channel, status):
    items, cursor = [], None
    for _ in range(10):
        after = ", after: " + qstr(cursor) if cursor else ""
        query = ("query { posts(first: 100" + after + ", input: {organizationId: " + qstr(org)
                 + ", filter: {status: [" + status + "], channelIds: [" + qstr(channel)
                 + "]}}) { edges { node { id dueAt channelId text } } pageInfo { hasNextPage endCursor } } }")
        page = gql(query)["posts"]
        items.extend(e["node"] for e in page["edges"] if e.get("node"))
        if not page["pageInfo"]["hasNextPage"]:
            return [{"id": p["id"], "local_time": parse_buffer_time(p["dueAt"]).astimezone(TIMEZONE).isoformat() if p.get("dueAt") else None,
                     "caption_present": bool(p.get("text"))} for p in items]
        cursor = page["pageInfo"]["endCursor"]
        if not cursor:
            raise RuntimeError("Incomplete pagination")
    raise RuntimeError("Pagination limit exceeded")

def main():
    now = dt.datetime.now(TIMEZONE)
    manifest = json.loads(Path(__file__).with_name("story-queue-2026.json").read_text())["posts"]
    report = {"checked_at": now.isoformat(), "accounts": {}, "media_errors": [], "errors": []}
    try:
        linked = [(o["id"], c) for o in organizations() for c in channels(o["id"]) if str(c.get("service","")).lower()=="instagram"]
        for handle in ("tennis.schiri", "tennilo.app"):
            entry = report["accounts"][handle] = {}
            matches = [(o,c) for o,c in linked if handle in {str(c.get(k) or "").lower().lstrip("@") for k in ("name","displayName")}]
            if len(matches)!=1:
                report["errors"].append(handle + ": channel not uniquely identified")
                continue
            org, channel = matches[0]
            entry["paused"] = channel.get("isQueuePaused")
            for status in ("scheduled", "sent", "error"):
                try:
                    entry[status] = {"verified": True, "posts": read_posts(org, channel["id"], status)}
                except Exception as exc:
                    entry[status] = {"verified": False, "error": str(exc)}
                    if status == "scheduled":
                        report["errors"].append(handle + ": scheduled status unavailable")
            if entry["scheduled"]["verified"]:
                posts = entry["scheduled"]["posts"]
                entry["scheduled_count"] = len(posts)
                entry["free_slots"] = max(0, 10-len(posts))
                slots = {p["local_time"][:19] for p in posts if p["local_time"]}
                entry["manifest_time_matches"] = [{"local_time": p["local_time"], "expected_format": p.get("format","story"), "source_uuid": p["metricool_uuid"], "buffer_time_match": p["local_time"] in slots} for p in manifest if p["account"]==handle and now.replace(tzinfo=None).isoformat()[:19] < p["local_time"]]
                if len(posts)>10 or entry["paused"]:
                    report["errors"].append(handle + ": capacity exceeded or queue paused")
    except Exception as exc:
        report["errors"].append(str(exc))
    for p in manifest:
        due = dt.datetime.fromisoformat(p["local_time"]).replace(tzinfo=TIMEZONE)
        if now < due <= now + dt.timedelta(hours=48):
            for url in p["media_urls"]:
                try:
                    verify_image(url)
                except Exception as exc:
                    report["media_errors"].append({"account":p["account"],"local_time":p["local_time"],"error":str(exc)})
    Path("buffer-status.json").write_text(json.dumps(report, indent=2, ensure_ascii=False)+"\n")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if report["errors"] or report["media_errors"]:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
