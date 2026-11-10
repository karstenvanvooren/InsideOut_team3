"""Fake fragments: our own cloth pages (not pages of the artwork), made to sit
between the real photo crops: linen page, a simple sewn motif, a little
texture and softness, saved as small JPEGs like the real pieces.
Run: python3 scripts/fragments/make-fakes.py  (needs Pillow)"""
import math, random
from PIL import Image, ImageDraw, ImageFilter

S = 4                      # draw at 4x, scale down at the end
W, H = 264, 240            # final size (like the real crops)
OUT = 'public/fragments/fake-{}.jpg'

def page(bg, panel=None, inset=0.12):
    im = Image.new('RGB', (W * S, H * S), bg)
    d = ImageDraw.Draw(im)
    if panel:
        mx, my = int(W * S * inset), int(H * S * inset)
        d.rectangle([mx, my, W * S - mx, H * S - my], fill=panel)
    return im, d

def clip(im, base, inset):
    """Keep a motif inside the panel (a sewn-on piece of cloth)."""
    mask = Image.new('L', im.size, 0)
    mx, my = int(W * S * inset), int(H * S * inset)
    ImageDraw.Draw(mask).rectangle([mx, my, W * S - mx, H * S - my], fill=255)
    return Image.composite(im, base, mask)

def finish(im, n, seed):
    """Make it look like the photo crops: uneven light, thread noise, soft, small, JPEG."""
    rnd = random.Random(seed)
    # uneven light (a soft shadow towards one corner, like the photo)
    shade = Image.new('L', im.size, 0)
    sd = ImageDraw.Draw(shade)
    sd.ellipse([-W * S * 0.3, -H * S * 0.3, W * S * 1.3, H * S * 1.3], fill=255)
    shade = shade.filter(ImageFilter.GaussianBlur(W * S * 0.12))
    dark = Image.new('RGB', im.size, (150, 140, 130))
    im = Image.composite(im, Image.blend(im, dark, 0.22), shade)
    px = im.load()
    for _ in range(W * H * 10):  # thread noise
        x, y = rnd.randrange(W * S), rnd.randrange(H * S)
        r, g, b = px[x, y]
        k = rnd.randint(-22, 22)
        px[x, y] = (max(0, min(255, r + k)), max(0, min(255, g + k)), max(0, min(255, b + k)))
    # soft like the photo: blur, go small, come back up, low JPEG quality
    im = Image.blend(im, Image.new('RGB', im.size, (226, 218, 206)), 0.12)  # photo colours are a bit faded
    im = im.filter(ImageFilter.GaussianBlur(9)).resize((int(W * 0.34), int(H * 0.34)), Image.LANCZOS)
    im = im.resize((W, H), Image.BICUBIC)
    im.save(OUT.format(n), quality=55)

# 1 · Blue dots
im, d = page((236, 232, 224), panel=(232, 222, 196), inset=0.1)
for i in range(5):
    for j in range(4):
        cx, cy = (0.2 + i * 0.15) * W * S, (0.22 + j * 0.19) * H * S
        r = 0.055 * W * S
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(60, 92, 170))
finish(im, 1, 1)

# 2 · Green ladder
im, d = page((214, 196, 170))
L, R = 0.36 * W * S, 0.64 * W * S
for x in (L, R):
    d.rectangle([x - 26, 0.12 * H * S, x + 26, 0.88 * H * S], fill=(44, 120, 84))
for k in range(6):
    y = (0.2 + k * 0.13) * H * S
    d.rectangle([L, y - 20, R, y + 20], fill=(44, 120, 84))
finish(im, 2, 2)

# 3 · Red crosshatch
base, _ = page((242, 240, 236))
im, d = page((250, 248, 244))
for k in range(-12, 13):
    o = k * 0.1 * W * S
    d.line([(o, 0), (o + H * S, H * S)], fill=(196, 40, 44), width=22)
    d.line([(o + H * S, 0), (o, H * S)], fill=(196, 40, 44), width=22)
finish(clip(im, base, 0.1), 3, 3)

# 4 · Pink half-moons
im, d = page((222, 220, 214))
for j in range(3):
    for i in range(3):
        cx, cy, r = (0.25 + i * 0.25) * W * S, (0.38 + j * 0.24) * H * S, 0.11 * W * S
        d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=(226, 140, 160))
finish(im, 4, 4)

# 5 · Navy waves
base, _ = page((238, 226, 204))
im, d = page((214, 120, 70))
for k in range(3):
    pts = [(x, (0.3 + k * 0.2) * H * S + math.sin(x / (W * S) * math.pi * 3) * 0.06 * H * S) for x in range(0, W * S + 1, 8)]
    d.line(pts, fill=(34, 44, 96), width=54, joint='curve')
finish(clip(im, base, 0.12), 5, 5)

# 6 · Black zigzag
im, d = page((236, 232, 226), panel=(238, 186, 192), inset=0.12)
pts = []
for k in range(9):
    pts.append(((0.18 + k * 0.08) * W * S, (0.3 if k % 2 else 0.7) * H * S))
d.line(pts, fill=(30, 28, 30), width=46, joint='curve')
finish(im, 6, 6)
