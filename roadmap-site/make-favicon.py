#!/usr/bin/env python3
"""Generate TENNILO Roadmap favicons from the authentic TENNILO app symbol.

Source asset is checked out from tennis-schiri/tennilo-website during deployment.
Never redraw the brand mark or add opaque rectangular corner backgrounds.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "brand-source/public/assets/tennilo-icon.png"
OUT = ROOT / "roadmap-site/dist"


def icon(size: int) -> Image.Image:
    with Image.open(SOURCE) as original:
        image = original.convert("RGBA")
    # Remove only fully transparent source padding; keep authentic pixels.
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError("TENNILO icon is fully transparent.")
    image = image.crop(bounds)
    image.thumbnail((int(size * 0.9), int(size * 0.9)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(
        image, ((size - image.width) // 2, (size - image.height) // 2)
    )
    return canvas


def main() -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(f"Authentic TENNILO icon missing: {SOURCE}")
    OUT.mkdir(parents=True, exist_ok=True)
    icon(256).save(
        OUT / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    icon(32).save(OUT / "favicon-32.png", format="PNG", optimize=True)
    icon(192).save(OUT / "favicon-192.png", format="PNG", optimize=True)
    icon(180).save(OUT / "apple-touch-icon.png", format="PNG", optimize=True)
    for name in [
        "favicon.ico", "favicon-32.png", "favicon-192.png", "apple-touch-icon.png"
    ]:
        path = OUT / name
        if not path.is_file() or path.stat().st_size < 50:
            raise RuntimeError(f"Favicon was not created correctly: {name}")
        print(f"Generated {name} from original TENNILO symbol")


if __name__ == "__main__":
    main()
