#!/usr/bin/env python3
"""Copy approved story graphics from Metricool to a stable public GitHub media branch.

Invoked by a manual GitHub Action, never by website deployment.
"""
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import urllib.parse
import urllib.request


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: mirror_assets.py manifest.json public_media_dir")
    manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    root = Path(sys.argv[2]).resolve()
    data = manifest.get("stories") or []
    done = existing = 0
    for index, entry in enumerate(data, 1):
        source = entry["source_url"]
        u = urllib.parse.urlparse(source)
        if u.scheme != "https" or u.netloc != "static.metricool.com" or not u.path.startswith("/planner/202611/"):
            raise ValueError(f"{index}: untrusted media host")
        rel = Path(entry["asset_path"])
        if rel.is_absolute() or ".." in rel.parts or rel.parts[0] != "stories" or rel.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            raise ValueError(f"{index}: invalid target path")
        target = (root / rel).resolve()
        if not target.is_relative_to(root):
            raise ValueError(f"{index}: media outside repository")
        if target.is_file():
            existing += 1
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(source,headers={"User-Agent":"Tennis-Schiri-Social-Mirror/1.0"})
        with urllib.request.urlopen(req,timeout=35) as response:
            ctype = response.headers.get("Content-Type","").split(";")[0].lower()
            if ctype not in {"image/png","image/jpeg"}:
                raise RuntimeError(f"{index}: Metricool file is not PNG/JPEG: {ctype}")
            content = response.read(8_000_001)
        if len(content) > 8_000_000 or len(content) < 500:
            raise RuntimeError(f"{index}: invalid media file size")
        if not (content.startswith(b"\x89PNG\r\n\x1a\n") or content[:3] == b"\xff\xd8\xff"):
            raise RuntimeError(f"{index}: media magic signature invalid")
        suffix_is_png = rel.suffix.lower() == ".png"
        if suffix_is_png != content.startswith(b"\x89PNG"):
            raise RuntimeError(f"{index}: media file extension mismatch")
        with tempfile.NamedTemporaryFile(dir=target.parent,delete=False) as fp:
            fp.write(content)
            tmp=fp.name
        os.replace(tmp,target)
        done += 1
    print(f"Media-Backup fertig: {done} neu, {existing} bereits vorhanden, {len(data)} insgesamt.")


if __name__ == "__main__":
    main()
