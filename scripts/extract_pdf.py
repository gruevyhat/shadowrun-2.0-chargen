"""OCR a Shadowrun rulebook PDF into per-page Markdown.

Usage:
    python extract_pdf.py <pdf_path> <output_dir> [--dpi 400] [--start 1] [--end N]

Writes one Markdown file per page to <output_dir>/page_NNNN.md and a
combined <output_dir>/all_pages.md at the end. Raster-renders each page
via pdf2image (poppler) and OCRs with pytesseract.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pdf2image import convert_from_path
import pytesseract


def ocr_pdf(pdf: Path, out_dir: Path, dpi: int, start: int, end: int | None) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    pages_dir = out_dir / "pages"
    pages_dir.mkdir(exist_ok=True)

    images = convert_from_path(
        str(pdf),
        dpi=dpi,
        first_page=start,
        last_page=end,
        thread_count=4,
    )

    combined = []
    for i, img in enumerate(images, start=start):
        text = pytesseract.image_to_string(img, lang="eng", config="--psm 1")
        page_md = f"# Page {i}\n\n{text.strip()}\n"
        (pages_dir / f"page_{i:04d}.md").write_text(page_md)
        combined.append(page_md)
        print(f"  page {i}: {len(text)} chars", file=sys.stderr)

    (out_dir / "all_pages.md").write_text("\n---\n\n".join(combined))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--dpi", type=int, default=400)
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=None)
    args = ap.parse_args()
    ocr_pdf(args.pdf, args.out_dir, args.dpi, args.start, args.end)


if __name__ == "__main__":
    main()
