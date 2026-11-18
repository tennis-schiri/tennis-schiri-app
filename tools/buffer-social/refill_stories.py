#!/usr/bin/env python3
"""Refill Buffer Free queues from an explicitly approved story manifest.

A scheduled GitHub Action runs this script. It is disabled until
tools/buffer-social/QUEUE_ENABLED.txt exists and has exact content YES.
No GitHub credentials or Buffer API keys are stored in repository files.

- Only story format; no Feed/Metricool posts touched.
- Only @tennis.schiri and @tennilo.app.
- Stable unique source keys and exact Berlin-local publish times.
- No duplicate scheduled slots on the same Buffer channel.
- Holds free plan at maximum 10 queued posts per channel.
- Skips past posts and continues with next upcoming.
- Never bypasses failed media validation or Buffer API errors.
"""
from __future__ import annotations
import datetime as dt
import ipaddress
import json
import os
from pathlib import Path
import socket
import sys
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

from buffer_social import gql, organizations, channels, select_channel, qstr, parse_buffer_time

HERE = Path(__file__).resolve().parent
QUEUE = HERE / "story-queue-2026.json"
ENABLED = HERE / "QUEUE_ENABLED.txt"
TZ = ZoneInfo("Europe/Berlin")
UTC = dt.timezone.utc
MAX_PER_CHANNEL = 10
SAFETY_MARGIN = dt.timedelta(minutes=20)


def from_local(local: str):
    value=dt.datetime.fromisoformat(local)
    if value.tzinfo is not None:
        raise ValueError(f"Queue-time unexpectedly timezone-aware: {local}")
    localized=value.replace(tzinfo=TZ)
    if localized.astimezone(UTC).astimezone(TZ).replace(tzinfo=None) != value:
        raise ValueError(f"Non-existent local time: {local}")
    return localized.astimezone(UTC)


def utc_graphql(value):
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def verify_image(url: str):
    p=urllib.parse.urlsplit(url)
    if p.scheme!="https" or not p.hostname:
        raise ValueError("Only HTTPS media allowed")
    if p.hostname.lower() not in {"static.metricool.com", "raw.githubusercontent.com"}:
        raise ValueError(f"Unapproved media host: {p.hostname}")
    if p.username or p.password or p.port not in (None,443):
        raise ValueError("URL credentials/nonstandard ports forbidden")
    for info in socket.getaddrinfo(p.hostname, 443, type=socket.SOCK_STREAM):
        if not ipaddress.ip_address(info[4][0]).is_global:
            raise ValueError(f"Non-public address for {p.hostname}")
    req=urllib.request.Request(url,headers={"User-Agent":"Tennis-Schiri-Buffer-Queue/1.0","Range":"bytes=0-4095"})
    with urllib.request.urlopen(req,timeout=18) as response:
        if response.url.split(":",1)[0].lower()!="https":
            raise ValueError("Unsafe redirect")
        ctype=response.headers.get("Content-Type","").split(";")[0].strip().lower()
        if ctype not in {"image/png","image/jpeg","image/webp"}:
            raise ValueError(f"Image URL is not a direct image ({ctype or 'unknown'})")
        response.read(8)


def buffer_scheduled(org_id, channel_id):
    result=[]
    cursor=None
    for _ in range(10):
        after=f", after: {qstr(cursor)}" if cursor else ""
        query=(f"query {{ posts(first: 100{after}, input: {{organizationId: {qstr(org_id)}, "
               f"filter: {{ status: [scheduled], channelIds: [{qstr(channel_id)}] }} }}) "
               "{ edges { node { id dueAt channelId text } } pageInfo { hasNextPage endCursor } } }")
        response=gql(query).get("posts") or {}
        result.extend(edge["node"] for edge in response.get("edges",[]) if edge.get("node"))
        pagination=response.get("pageInfo") or {}
        if not pagination.get("hasNextPage"):
            return result
        cursor=pagination.get("endCursor")
        if not cursor:
            raise RuntimeError("Incomplete Buffer queue pagination")
    raise RuntimeError("Queue pagination exceeded limit")


def schedule(channel_id, due, media_url):
    query=(
        "mutation { createPost(input: { "
        'text: "" '
        f"channelId: {qstr(channel_id)} "
        "schedulingType: automatic "
        "mode: customScheduled "
        f"dueAt: {qstr(utc_graphql(due))} "
        f"assets: [{{ image: {{ url: {qstr(media_url)} }} }}] "
        "metadata: {instagram: {type: story, shouldShareToFeed: false}} "
        "}) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }"
    )
    reply=gql(query).get("createPost") or {}
    if reply.get("message"):
        raise RuntimeError("Buffer rejected post: "+str(reply["message"]))
    post=reply.get("post")
    if not post or not post.get("id"):
        raise RuntimeError("Buffer returned no new post id")
    return post


def main():
    if not ENABLED.exists() or ENABLED.read_text(encoding="utf-8").strip()!="YES":
        print("Buffer queue disabled: migration approval file not installed. No changes.")
        return
    data=json.loads(QUEUE.read_text(encoding="utf-8"))
    if data.get("version")!=1 or len(data.get("posts",[]))!=74:
        raise ValueError("Story manifest changed unexpectedly; stop and review")
    posts=data["posts"]
    unique=set()
    for entry in posts:
        key=(entry["account"],entry["local_time"])
        if key in unique:
            raise ValueError("Duplicate date/account entry in manifest")
        unique.add(key)
        if entry["account"] not in {"tennis.schiri","tennilo.app"}:
            raise ValueError("Unexpected Instagram account")
        if len(entry.get("media_urls",[]))!=1:
            raise ValueError("Each story must have precisely one image")
    orgs=organizations()
    linked=[]
    for org in orgs:
        for ch in channels(org["id"]):
            if str(ch.get("service","")).lower()=="instagram":
                linked.append((org,ch))
    now=dt.datetime.now(UTC)
    print(f"Buffer queue refill started ({now.isoformat()})")
    error_count=0
    created_count=0
    for handle in ("tennis.schiri","tennilo.app"):
        channel=select_channel([c for _,c in linked],handle)
        org_id=next(org["id"] for org,ch in linked if ch["id"]==channel["id"])
        queued=buffer_scheduled(org_id,channel["id"])
        occupied=set()
        for post in queued:
            if post.get("dueAt"):
                occupied.add(parse_buffer_time(post["dueAt"]))
        slots=max(0,MAX_PER_CHANNEL-len(queued))
        pending=sorted(
            ((from_local(p["local_time"]),p) for p in posts if p["account"]==handle),
            key=lambda item:item[0]
        )
        ready=[(due,p) for due,p in pending if due>now+SAFETY_MARGIN and due not in occupied]
        print(f"@{handle}: {len(queued)} scheduled, {slots} slots free, {len(ready)} future unqueued stories")
        for due,post in ready[:slots]:
            try:
                verify_image(post["media_urls"][0])
                out=schedule(channel["id"],due,post["media_urls"][0])
                occupied.add(due)
                created_count+=1
                print(f"  scheduled {post['local_time']} -> Buffer {out['id']}")
            except Exception as e:
                error_count+=1
                print(f"  FAILED {post['local_time']}: {e}", file=sys.stderr)
                # Leave capacity for a later retry. Don't skip to later dates:
                # a failed nearer story must not be starved by more recent ones.
                break
    print(f"Result: {created_count} newly scheduled; {error_count} errors.")
    if error_count:
        raise RuntimeError("One or more upcoming stories were not scheduled; inspect logs")


if __name__=="__main__":
    main()
