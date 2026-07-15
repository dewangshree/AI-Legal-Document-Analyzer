"""
parser.py — Extract text from uploaded legal documents.
Supports: PDF (via pdfplumber), DOCX, TXT
"""

import io
import logging
from pathlib import Path

import pdfplumber
from docx import Document

logger = logging.getLogger(__name__)


def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Dispatch to the appropriate extractor based on file extension.
    Returns plain text string.
    """
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return _extract_pdf(file_bytes)
    elif ext == ".docx":
        return _extract_docx(file_bytes)
    elif ext == ".txt":
        return _extract_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: '{ext}'. Please upload PDF, DOCX, or TXT.")


# ── PDF ──────────────────────────────────────────────────────────────────────

def _extract_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber."""
    pages = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pages.append(page_text)
    except Exception as exc:
        raise ValueError(f"Failed to read PDF: {exc}") from exc

    text = "\n\n".join(pages)
    if not text.strip():
        raise ValueError(
            "Could not extract any text from the PDF. "
            "The file may be scanned or image-only. "
            "Please use a text-based PDF."
        )
    return text


# ── DOCX ─────────────────────────────────────────────────────────────────────

def _extract_docx(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError(f"Failed to read DOCX: {exc}") from exc

    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    if not paragraphs:
        raise ValueError("The DOCX file appears to be empty or contains no readable text.")
    return "\n\n".join(paragraphs)


# ── TXT ──────────────────────────────────────────────────────────────────────

def _extract_txt(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            text = file_bytes.decode(encoding)
            if text.strip():
                return text
        except (UnicodeDecodeError, ValueError):
            continue
    raise ValueError("Could not decode the TXT file. Please ensure it uses UTF-8 encoding.")
