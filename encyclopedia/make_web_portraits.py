"""Resize portraits/ into portraits_web/ for the encyclopedia page.

Writes small progressive JPEGs (max MAX_WIDTH px wide, never upscaled) and
portraits_web/manifest.json listing which names have a portrait, so the page
doesn't have to download every image before rendering.

Re-run after adding or replacing anything in portraits/:
    python3 make_web_portraits.py
"""
import json
import os

from PIL import Image, ImageOps

SRC = "portraits"
DST = "portraits_web"
MAX_WIDTH = 300
QUALITY = 82

os.makedirs(DST, exist_ok=True)
names = []

for filename in sorted(os.listdir(SRC)):
    stem, ext = os.path.splitext(filename)
    if ext.lower() not in (".jpg", ".jpeg", ".png") or stem.startswith("."):
        continue

    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, filename)))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")

    if im.width > MAX_WIDTH:
        im = im.resize((MAX_WIDTH, round(im.height * MAX_WIDTH / im.width)), Image.LANCZOS)

    im.save(os.path.join(DST, stem + ".jpg"), "JPEG",
            quality=QUALITY, optimize=True, progressive=True)

    if stem != "placeholder":
        names.append(stem)

with open(os.path.join(DST, "manifest.json"), "w") as f:
    json.dump(names, f, indent=0, ensure_ascii=False)

print(f"Wrote {len(names)} portraits (+ placeholder) to {DST}/")
