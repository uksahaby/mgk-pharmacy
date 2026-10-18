"""Draws the MGK mark (red rounded square, white cross; same as the website's logo and
apps/web/app/icon.svg) as PNGs for the app icon and splash screen.

    python tool/make_brand_assets.py
    dart run flutter_launcher_icons
    dart run flutter_native_splash:create
"""
from pathlib import Path

from PIL import Image, ImageDraw

RED = (215, 31, 51, 255)  # brand-600, #d71f33
WHITE = (255, 255, 255, 255)
SS = 4  # supersampling for smooth edges
OUT = Path(__file__).resolve().parent.parent / "assets" / "brand"


def cross(draw, cx, cy, length, arm, fill):
    h, a = length / 2, arm / 2
    draw.rectangle([cx - a, cy - h, cx + a, cy + h], fill=fill)
    draw.rectangle([cx - h, cy - a, cx + h, cy + a], fill=fill)


def canvas(size, bg=(0, 0, 0, 0)):
    img = Image.new("RGBA", (size * SS, size * SS), bg)
    return img, ImageDraw.Draw(img)


def save(img, size, name):
    OUT.mkdir(parents=True, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(OUT / name)


def mark(size, square, name, bg=(0, 0, 0, 0)):
    """Rounded red square of side `square` (fraction of the canvas) with the cross, centred."""
    img, d = canvas(size, bg)
    s = size * SS
    side = s * square
    x0 = (s - side) / 2
    d.rounded_rectangle([x0, x0, x0 + side, x0 + side], radius=side * 0.3, fill=RED)
    cross(d, s / 2, s / 2, side * 0.4, side * 0.1, WHITE)
    save(img, size, name)


# Full-bleed icon (iOS and older Android launchers apply their own mask).
img, d = canvas(1024, RED)
cross(d, 512 * SS, 512 * SS, 1024 * SS * 0.46, 1024 * SS * 0.115, WHITE)
save(img, 1024, "icon.png")

# Android adaptive icon foreground: only the middle 72 of 108 dp is visible, so the cross is smaller.
img, d = canvas(1024)
cross(d, 512 * SS, 512 * SS, 1024 * SS * 0.31, 1024 * SS * 0.078, WHITE)
save(img, 1024, "icon_foreground.png")

# Splash (pre-Android 12 and iOS): drawn at 4x, so 480 px shows as 120 dp.
mark(480, 1.0, "splash.png")
# Android 12+ splash: shown inside a circle 2/3 the canvas, so the square must fit inside it.
mark(1152, 0.52, "splash_android12.png")
print("wrote", sorted(p.name for p in OUT.iterdir()))
