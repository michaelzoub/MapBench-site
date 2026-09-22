"""Regenerate public/og.png, the 1200x630 link-preview card.

The card is the site's identity in one frame: the Rubric Labs lockup in the
corner, the project name, the research question in the site's own words, and
the measured sample. Run it after the headline numbers in src/results.js move.

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
DIM = (108, 108, 108)
RULE = (44, 44, 44)

TITLE = "MapBench"
QUESTION = [
    "Do deterministic structural artifacts help agents",
    "traverse unfamiliar codebases more efficiently?",
]
SAMPLE = "359 trials  ·  30 tasks  ·  4 conditions  ·  3 repetitions"


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
    parser.add_argument("--wordmark", required=True, help="Rubric white wordmark PNG")
    parser.add_argument("--out", default=str(ROOT / "public" / "og-card.png"))
    args = parser.parse_args()

    card = Image.new("RGB", (WIDTH, HEIGHT), INK)
    draw = ImageDraw.Draw(card)

    # Rubric Labs lockup, top-left, quiet enough to stay a credit.
    wordmark = Image.open(args.wordmark).convert("RGBA")
    wordmark = wordmark.crop(wordmark.getbbox())
    target_height = 30
    scale = target_height / wordmark.height
    wordmark = wordmark.resize((round(wordmark.width * scale), target_height), Image.LANCZOS)
    wordmark = tint(wordmark, PAPER, 0.62)
    wordmark_top = PAD - 4
    card.paste(wordmark, (PAD, wordmark_top), wordmark)

    # "labs" rides the wordmark's own baseline so the lockup reads as one unit.
    label = weighted(args.font, 17, 460)
    draw.text((PAD + wordmark.width + 15, wordmark_top + target_height), "labs", font=label, fill=DIM, anchor="ls")

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

    # Measured sample, the same framing as the results page.
    draw.line([(PAD, HEIGHT - PAD - 52), (WIDTH - PAD, HEIGHT - PAD - 52)], fill=RULE, width=1)
    sample_font = weighted(args.font, 16, 460)
    draw.text((PAD, HEIGHT - PAD - 30), SAMPLE, font=sample_font, fill=DIM)

    card.save(args.out, "PNG", optimize=True)
    print(f"wrote {args.out} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
