"""Generate social preview image for awesome-ai-anatomy."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1280, 640
BLUE = "#2563eb"
DARK = "#1e293b"
GRAY = "#64748b"
WHITE = "#ffffff"
LIGHT_BG = "#f8fafc"

img = Image.new("RGB", (W, H), WHITE)
draw = ImageDraw.Draw(img)

# Draw a subtle top accent bar
draw.rectangle([0, 0, W, 6], fill=BLUE)

# Try to find a good font - use Arial/Segoe UI on Windows, fallback to default
def get_font(size, bold=False):
    candidates = []
    if bold:
        candidates = [
            "C:/Windows/Fonts/segoeuib.ttf",  # Segoe UI Bold
            "C:/Windows/Fonts/arialbd.ttf",    # Arial Bold
            "C:/Windows/Fonts/calibrib.ttf",   # Calibri Bold
        ]
    else:
        candidates = [
            "C:/Windows/Fonts/segoeui.ttf",    # Segoe UI
            "C:/Windows/Fonts/arial.ttf",       # Arial
            "C:/Windows/Fonts/calibri.ttf",     # Calibri
        ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

font_title = get_font(64, bold=True)
font_subtitle = get_font(30)
font_stats = get_font(24, bold=True)
font_url = get_font(22)
font_badge = get_font(18, bold=True)

# Draw "AWESOME" badge
badge_text = "AWESOME LIST"
bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
badge_w = bbox[2] - bbox[0] + 24
badge_h = bbox[3] - bbox[1] + 14
badge_x = (W - badge_w) // 2
badge_y = 60
draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=4, fill=BLUE)
draw.text((badge_x + 12, badge_y + 5), badge_text, fill=WHITE, font=font_badge)

# Title
title = "Awesome AI Anatomy"
bbox = draw.textbbox((0, 0), title, font=font_title)
tw = bbox[2] - bbox[0]
draw.text(((W - tw) // 2, 120), title, fill=DARK, font=font_title)

# Subtitle
subtitle = "Deep source code teardowns of 13 AI agent projects"
bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
sw = bbox[2] - bbox[0]
draw.text(((W - sw) // 2, 210), subtitle, fill=GRAY, font=font_subtitle)

# Divider line
div_y = 275
draw.line([(W//2 - 200, div_y), (W//2 + 200, div_y)], fill="#e2e8f0", width=2)

# Stats line
stats = "400K+ lines analyzed  •  Architecture diagrams  •  Security audits  •  Fact-checked"
bbox = draw.textbbox((0, 0), stats, font=font_stats)
stw = bbox[2] - bbox[0]
draw.text(((W - stw) // 2, 310), stats, fill=BLUE, font=font_stats)

# Project icons / mini list (3 columns of project names)
projects = [
    "OpenHands", "Cline", "Claude Code", "Dify", "Goose",
    "DeerFlow", "MiroFish", "Pi Mono", "Lightpanda",
    "Hermes Agent", "Guardrails AI", "Oh My Claude Code", "Codex CLI"
]
font_proj = get_font(17)
cols = 4
row_h = 28
start_y = 380
start_x = 160
col_w = (W - 2 * start_x) // cols

for i, proj in enumerate(projects):
    col = i % cols
    row = i // cols
    x = start_x + col * col_w
    y = start_y + row * row_h
    draw.text((x, y), f"▸ {proj}", fill=GRAY, font=font_proj)

# Bottom bar
draw.rectangle([0, H - 60, W, H], fill=LIGHT_BG)
draw.line([(0, H - 60), (W, H - 60)], fill="#e2e8f0", width=1)

# URL at bottom
url = "github.com/NeuZhou/awesome-ai-anatomy"
bbox = draw.textbbox((0, 0), url, font=font_url)
uw = bbox[2] - bbox[0]
draw.text(((W - uw) // 2, H - 45), url, fill=GRAY, font=font_url)

# GitHub icon approximation - small circle
gh_x = (W - uw) // 2 - 30
gh_y = H - 40
draw.ellipse([gh_x, gh_y, gh_x + 20, gh_y + 20], fill=DARK)

out_path = os.path.join(os.path.dirname(__file__), "social-preview.png")
img.save(out_path, "PNG")
print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")
