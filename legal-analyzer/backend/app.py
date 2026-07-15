"""
app.py — FastAPI application for the AI Legal Document Analyzer.

Endpoints:
  POST /upload        → extract text from uploaded file
  POST /summary       → AI-generated structured summary
  POST /clauses       → extract legal clauses as JSON
  POST /risks         → detect and classify legal risks
  POST /compare       → compare two contracts side-by-side
"""

import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import parser as doc_parser
import groq_service
from utils import build_error

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Legal Document Analyzer",
    description="Upload legal documents and get AI-powered analysis.",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ───────────────────────────────────────────────────────────────────

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def _validate_file(file: UploadFile) -> None:
    from pathlib import Path
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Please upload PDF, DOCX, or TXT.",
        )


async def _read_file(file: UploadFile) -> tuple[bytes, str]:
    """Read and return (bytes, filename). Raises 413 if too large."""
    _validate_file(file)
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20 MB cap
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 20 MB.")
    return content, file.filename or "document"


def _extract(file_bytes: bytes, filename: str) -> str:
    """Extract text and raise 422 on parser errors."""
    try:
        return doc_parser.extract_text(file_bytes, filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


def _llm_call(func, *args):
    """Wrap LLM calls and convert exceptions to HTTP 500."""
    try:
        return func(*args)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("LLM call failed.")
        raise HTTPException(status_code=500, detail=f"AI service error: {exc}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "AI Legal Document Analyzer"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """
    Upload a legal document (PDF / DOCX / TXT).
    Returns: extracted plain text and basic metadata.
    """
    file_bytes, filename = await _read_file(file)
    text = _extract(file_bytes, filename)
    word_count = len(text.split())
    char_count = len(text)
    logger.info("Uploaded '%s' — %d words / %d chars.", filename, word_count, char_count)
    return {
        "filename": filename,
        "word_count": word_count,
        "char_count": char_count,
        "text": text,
    }


@app.post("/summary")
async def summary(file: UploadFile = File(...)):
    """
    Upload a document and receive an AI-generated structured summary.
    """
    file_bytes, filename = await _read_file(file)
    text = _extract(file_bytes, filename)
    result = _llm_call(groq_service.generate_summary, text)
    return result


@app.post("/clauses")
async def clauses(file: UploadFile = File(...)):
    """
    Upload a document and receive extracted legal clauses as structured JSON.
    """
    file_bytes, filename = await _read_file(file)
    text = _extract(file_bytes, filename)
    data = _llm_call(groq_service.extract_clauses, text)
    return {"clauses": data}


@app.post("/risks")
async def risks(file: UploadFile = File(...)):
    """
    Upload a document and receive a risk assessment with severity classifications
    and an overall contract risk score (0-100).
    """
    file_bytes, filename = await _read_file(file)
    text = _extract(file_bytes, filename)
    # detect_risks now returns {risks: [...], risk_score: int}
    data = _llm_call(groq_service.detect_risks, text)
    return data


@app.post("/compare")
async def compare(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
):
    """
    Upload two documents and receive a structured comparison table with
    change_type labels (Added / Removed / Modified) and a plain-English summary.
    """
    bytes1, name1 = await _read_file(file1)
    bytes2, name2 = await _read_file(file2)
    text1 = _extract(bytes1, name1)
    text2 = _extract(bytes2, name2)
    # compare_contracts now returns {comparison: [...], summary: str}
    data = _llm_call(groq_service.compare_contracts, text1, text2)
    return {
        "file1": name1,
        "file2": name2,
        "comparison": data.get("comparison", []),
        "summary": data.get("summary", ""),
    }
