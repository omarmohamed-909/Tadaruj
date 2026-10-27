"""Create small delivery copies of existing brand artwork; preserve the source PNGs."""
from pathlib import Path
from PIL import Image, ImageOps

public = Path(__file__).resolve().parents[1] / "public"
for stem, limit, output in [
    ("tadaruj-logo", 512, "tadaruj-logo.webp"),
    ("tadaruj-logo-dark", 512, "tadaruj-logo-dark.webp"),
    ("tadaruj-logo-ar", 512, "tadaruj-logo-ar.webp"),
    ("tadaruj-logo-ar-dark", 512, "tadaruj-logo-ar-dark.webp"),
    ("default-avatar", 384, "default-avatar.webp"),
    ("favicon", 192, "brand-mark.webp"),
]:
    source = public / f"{stem}.png"
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGBA")
    image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    target = public / output
    image.save(target, "WEBP", lossless=True, method=6)
    print(f"{output}: {source.stat().st_size} -> {target.stat().st_size} bytes")

mark = Image.open(public / "favicon.png").convert("RGBA")
mark.thumbnail((32, 32), Image.Resampling.LANCZOS)
icon = Image.new("RGBA", (32, 32))
icon.paste(mark, ((32 - mark.width) // 2, (32 - mark.height) // 2))
icon.save(public / "favicon-32.png", optimize=True)
