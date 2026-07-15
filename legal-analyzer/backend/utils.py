"""
utils.py — Shared helpers for the Legal Analyzer backend.
"""

import re
import json
import logging

logger = logging.getLogger(__name__)

# Characters allowed in document text (rough sanity cap)
MAX_DOCUMENT_CHARS = 100_000


def truncate_text(text: str, max_chars: int = MAX_DOCUMENT_CHARS) -> str:
    """
    Truncate document text to keep within LLM token budgets.
    Trims at the nearest paragraph boundary where possible.
    """
    if len(text) <= max_chars:
        return text

    truncated = text[:max_chars]
    last_newline = truncated.rfind("\n")
    if last_newline > max_chars * 0.9:
        truncated = truncated[:last_newline]

    logger.warning("Document text truncated from %d to %d chars.", len(text), len(truncated))
    return truncated


def safe_parse_json(raw: str) -> list | dict:
    """
    Robustly parse JSON from an LLM response that may contain
    markdown fences or extra prose around the JSON block.
    """
    # Try direct parse first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    cleaned = re.sub(r"```(?:json)?\s*", "", raw)
    cleaned = cleaned.replace("```", "").strip()

    # Extract first JSON object/array from the text
    for pattern in (r"\[.*\]", r"\{.*\}"):
        match = re.search(pattern, cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                continue

    logger.error("Could not parse JSON from LLM response:\n%s", raw[:500])
    raise ValueError("The AI returned an unexpected response format. Please try again.")


def build_error(message: str, detail: str = "") -> dict:
    """Standardised error payload."""
    return {"error": message, "detail": detail}
