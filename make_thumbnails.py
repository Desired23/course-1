# -*- coding: utf-8 -*-
"""Generate themed course thumbnails (1280x720) from video file names."""
import math
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
W, H = 1280, 720
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REG = r"C:\Windows\Fonts\arial.ttf"

# Topic palettes: (keywords) -> (tag, color_a, color_b, accent)
TOPICS = [
    (["python", "ram", "generator", "comprehension", "biến", "thực thi", "lỗi"],
     "PYTHON", (30, 60, 114), (43, 88, 118), (255, 211, 67)),
    (["toán"], "TOÁN HỌC", (17, 98, 71), (39, 174, 96), (245, 245, 245)),
    (["tiếng anh", "chứng chỉ"], "TIẾNG ANH", (155, 28, 49), (211, 67, 67), (255, 224, 130)),
    (["marketing", "quảng bá", "thị trường", "thông điệp"],
     "MARKETING", (88, 28, 135), (147, 51, 234), (240, 200, 255)),
    (["kế toán", "đầu tư", "rủi ro"], "TÀI CHÍNH", (12, 74, 90), (16, 130, 140), (170, 240, 235)),
    (["năng lượng", "time blocking", "đọc chủ động", "thói quen", "vận động"],
     "KỸ NĂNG", (140, 60, 10), (235, 120, 30), (255, 225, 180)),
    (["dựng video", "video"], "SẢN XUẤT VIDEO", (40, 40, 50), (80, 80, 95), (210, 210, 220)),
]
DEFAULT = ("KHÓA HỌC", (33, 41, 61), (63, 78, 110), (220, 225, 240))


def pick_topic(name):
    low = name.lower()
    for kws, tag, a, b, acc in TOPICS:
        if any(k in low for k in kws):
            return tag, a, b, acc
    return DEFAULT


def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def diagonal_gradient(a, b):
    img = Image.new("RGB", (W, H), a)
    px = img.load()
    maxd = W + H
    for y in range(H):
        for x in range(0, W, 2):
            t = (x + y) / maxd
            c = lerp(a, b, t)
            px[x, y] = c
            if x + 1 < W:
                px[x + 1, y] = c
    return img


def add_texture(img, accent):
    """Soft decorative circles for depth."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    spots = [(W - 160, 140, 220), (W - 320, H - 120, 300), (120, H - 80, 180)]
    for cx, cy, r in spots:
        d.ellipse([cx - r, cy - r, cx + r, cy + r],
                  fill=(accent[0], accent[1], accent[2], 18))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))
    return img


def wrap(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def make(title, out_path):
    tag, a, b, accent = pick_topic(title)
    img = diagonal_gradient(a, b)
    img = add_texture(img, accent)
    d = ImageDraw.Draw(img)

    margin = 90
    # accent bar
    d.rectangle([margin, 250, margin + 70, 262], fill=accent)

    # category tag
    tag_font = ImageFont.truetype(FONT_BOLD, 34)
    d.text((margin, 190), tag, font=tag_font, fill=accent)

    # title (auto-fit)
    size = 78
    while size > 40:
        tf = ImageFont.truetype(FONT_BOLD, size)
        lines = wrap(d, title, tf, W - 2 * margin)
        if len(lines) <= 3:
            break
        size -= 6
    tf = ImageFont.truetype(FONT_BOLD, size)
    lines = wrap(d, title, tf, W - 2 * margin)
    line_h = int(size * 1.25)
    y = 300
    for ln in lines:
        # subtle shadow for readability
        d.text((margin + 2, y + 2), ln, font=tf, fill=(0, 0, 0))
        d.text((margin, y), ln, font=tf, fill=(255, 255, 255))
        y += line_h

    # footer brand line
    foot = ImageFont.truetype(FONT_REG, 28)
    d.line([margin, H - 90, margin + 60, H - 90], fill=accent, width=4)
    d.text((margin, H - 78), "E-Learning Platform", font=foot, fill=(235, 238, 245))

    img.save(out_path, "PNG")


SKIP = {"10 Seconds Countdown Timer - YouTube"}


def main():
    made = []
    for fn in sorted(os.listdir(ROOT)):
        if not fn.lower().endswith(".mp4"):
            continue
        base = os.path.splitext(fn)[0]
        if base in SKIP:
            continue
        title = base.replace("_", " ").strip()
        out = os.path.join(ROOT, base + ".png")
        make(title, out)
        made.append(base + ".png")
    print("Created %d thumbnails:" % len(made))
    for m in made:
        print("  " + m)


if __name__ == "__main__":
    main()
