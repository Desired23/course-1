# -*- coding: utf-8 -*-
"""Tạo ảnh bìa phù hợp cho từng khóa demo, upload Cloudinary và gán thumbnail.
Chạy trong thư mục course/ (server đang chạy)."""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import requests
from PIL import Image, ImageDraw, ImageFont
from users.services import _issue_auth_tokens
from users.models import User

API = "http://127.0.0.1:8080/api"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tmp_thumbs")
os.makedirs(OUT, exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_REG = "C:/Windows/Fonts/arial.ttf"
FONT_EMOJI = "C:/Windows/Fonts/seguiemj.ttf"

W, H = 1280, 720

# course_id -> (title, category_label, emoji, color_top, color_bottom)
THUMBS = {
    932: ("Digital Marketing Toàn Diện", "MARKETING", "📈", (236, 64, 122), (123, 31, 162)),
    934: ("Nhập Môn Lập Trình Python", "LẬP TRÌNH", "🐍", (33, 64, 120), (255, 196, 0)),
    935: ("Tài Chính Cá Nhân & Đầu Tư", "TÀI CHÍNH", "💰", (17, 153, 142), (56, 239, 125)),
    936: ("Tiếng Anh Giao Tiếp & Luyện Thi", "NGOẠI NGỮ", "🗣️", (33, 147, 176), (109, 213, 237)),
    937: ("Tư Duy & Năng Suất Đỉnh Cao", "PHÁT TRIỂN BẢN THÂN", "⏱️", (74, 0, 224), (142, 45, 226)),
    938: ("Dựng Video Cơ Bản", "NHIẾP ẢNH & VIDEO", "🎬", (252, 92, 125), (106, 130, 251)),
}


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_image(path, title, category, emoji, c_top, c_bot):
    img = Image.new("RGB", (W, H))
    px = img.load()
    # gradient chéo
    for y in range(H):
        row = lerp(c_top, c_bot, y / H)
        for x in range(W):
            t = (x / W) * 0.25
            px[x, y] = lerp(row, c_bot, t)
    draw = ImageDraw.Draw(img)

    # lớp phủ tối nhẹ ở dưới cho dễ đọc chữ
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle([0, H - 230, W, H], fill=(0, 0, 0, 90))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # emoji
    try:
        ef = ImageFont.truetype(FONT_EMOJI, 200)
        draw.text((W // 2, 230), emoji, font=ef, anchor="mm", embedded_color=True)
    except Exception as e:
        print("  emoji skip:", e)

    # tiêu đề (wrap 2 dòng nếu cần)
    tf = ImageFont.truetype(FONT_BOLD, 64)
    words = title.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=tf) > W - 140 and cur:
            lines.append(cur)
            cur = w
        else:
            cur = test
    if cur:
        lines.append(cur)
    y = 430
    for ln in lines:
        draw.text((W // 2, y), ln, font=tf, fill=(255, 255, 255), anchor="mm",
                  stroke_width=2, stroke_fill=(0, 0, 0))
        y += 78

    # nhãn danh mục
    cf = ImageFont.truetype(FONT_BOLD, 30)
    draw.text((W // 2, H - 70), category, font=cf, fill=(255, 255, 255), anchor="mm")

    img.save(path, "JPEG", quality=88)
    return path


def main():
    admin = User.objects.get(username="admin")
    token = _issue_auth_tokens(admin)["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    for cid, (title, cat, emoji, ct, cb) in THUMBS.items():
        path = os.path.join(OUT, f"course_{cid}.jpg")
        make_image(path, title, cat, emoji, ct, cb)
        with open(path, "rb") as f:
            files = [("files", (f"course_{cid}.jpg", f, "image/jpeg"))]
            data = {"folder": "course-thumbnails", "resource_type": "image"}
            r = requests.post(f"{API}/cloudinary/upload/", headers=headers, files=files, data=data, timeout=120)
        r.raise_for_status()
        url = r.json()[0]["url"]
        rp = requests.patch(f"{API}/courses/{cid}/update", headers=headers, json={"thumbnail": url}, timeout=60)
        rp.raise_for_status()
        print(f"#{cid} thumbnail -> {url}")


if __name__ == "__main__":
    main()
