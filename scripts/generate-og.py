"""Regenerate public/og.png, the 1200x630 link-preview card.

The card is the site's identity in one frame: the Rubric lockup in the
corner, the project name, and the research question in the site's own words.

    python3 scripts/generate-og.py --font /path/to/Inter.ttf

Inter is not vendored; pass the variable TTF (google/fonts ofl/inter).
"""

import argparse
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1200, 630
PAD = 76

PAPER = (255, 255, 255)
INK = (14, 14, 14)
MUTED = (150, 150, 150)

TITLE = "MapBench"
QUESTION = [
    "Do deterministic structural artifacts help agents",
    "traverse unfamiliar codebases more efficiently?",
]


def weighted(path, size, weight):
    font = ImageFont.truetype(str(path), size)
    font.set_variation_by_axes([weight])
    return font


def tint(mask_image, color, opacity):
    """Recolor a transparent-background logo and set its overall opacity."""
    alpha = mask_image.getchannel("A").point(lambda value: int(value * opacity))
    solid = Image.new("RGBA", mask_image.size, color + (255,))
    solid.putalpha(alpha)
    return solid


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--font", required=True, help="Inter variable TTF")
    parser.add_argument(
        "--icon",
        default=str(ROOT / "public" / "rubric-logo.png"),
        help="Rubric icon mark PNG (transparent background)",
    )
    parser.add_argument("--out", default=str(ROOT / "public" / "og-card.png"))
    args = parser.parse_args()

    card = Image.new("RGB", (WIDTH, HEIGHT), INK)
    draw = ImageDraw.Draw(card)

    # Rubric icon, top-left, quiet enough to stay a credit.
    icon = Image.open(args.icon).convert("RGBA")
    icon = icon.crop(icon.getbbox())
    target_height = 30
    scale = target_height / icon.height
    icon = icon.resize((round(icon.width * scale), target_height), Image.LANCZOS)
    icon = tint(icon, PAPER, 0.62)
    icon_top = PAD - 4
    card.paste(icon, (PAD, icon_top), icon)

    # Project name.
    title_font = weighted(args.font, 108, 640)
    title_y = 238
    draw.text((PAD, title_y), TITLE, font=title_font, fill=PAPER)

    # The research question, in the wording the site uses.
    question_font = weighted(args.font, 29, 400)
    y = title_y + 152
    for line in QUESTION:
        draw.text((PAD, y), line, font=question_font, fill=MUTED)
        y += 42

    card.save(args.out, "PNG", optimize=True)
    print(f"wrote {args.out} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
