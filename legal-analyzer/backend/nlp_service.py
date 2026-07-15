"""
nlp_service.py — Lightweight NLP pipeline for the AI Legal Document Analyzer.

Responsibilities
----------------
1. Named-entity extraction  (PERSON, ORG, DATE, MONEY, GPE/LOC)
   using spaCy en_core_web_sm.

2. Rule-based clause classification
   Maps sentence-level keyword patterns → legal clause category
   (Payment, Confidentiality, Termination, Liability, Indemnity,
    Governing Law, Dispute Resolution, Renewal, Obligations).

3. Pre-LLM risk screening
   Detects risky language patterns before the LLM call so the
   LLM prompt can be enriched with NLP-identified signals.

All public functions return plain dicts/lists so they are directly
JSON-serialisable and can be consumed by FastAPI endpoints or injected
into Groq prompts as structured context.
"""

from __future__ import annotations

import re
import logging
from collections import defaultdict
from typing import Any

logger = logging.getLogger(__name__)

# ── spaCy lazy-load ───────────────────────────────────────────────────────────

_nlp = None  # loaded on first use

def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model 'en_core_web_sm' loaded.")
        except OSError:
            logger.warning(
                "spaCy model 'en_core_web_sm' not found. "
                "Run: python -m spacy download en_core_web_sm"
            )
            _nlp = None
    return _nlp


# ── Clause classification patterns ────────────────────────────────────────────

# Each category maps to a list of keyword phrases.
# Sentence wins the category whose keywords score highest.
CLAUSE_PATTERNS: dict[str, list[str]] = {
    "Payment": [
        "payment", "pay", "invoice", "fee", "remuneration", "compensation",
        "salary", "amount due", "payable", "installment", "milestone payment",
        "net 30", "net 60", "overdue", "late fee", "interest on late",
        "consideration", "price", "cost", "expense", "reimburse",
    ],
    "Confidentiality": [
        "confidential", "non-disclosure", "nda", "proprietary", "trade secret",
        "secret", "disclose", "disclosure", "confidentiality",
        "sensitive information", "not share", "shall not reveal",
        "keep confidential", "protect information",
    ],
    "Termination": [
        "terminat", "cancel", "cancellation", "end of agreement",
        "expir", "notice period", "notice of termination",
        "shall terminate", "may terminate", "right to terminate",
        "without cause", "for cause", "breach", "immediate termination",
    ],
    "Liability": [
        "liabilit", "liable", "damages", "indemnif", "hold harmless",
        "limitation of liability", "cap on damages", "consequential damages",
        "punitive damages", "direct damages", "indirect damages",
        "aggregate liability", "not responsible", "disclaim",
    ],
    "Indemnity": [
        "indemnif", "indemnification", "indemnitor", "indemnitee",
        "defend", "hold harmless", "reimburse losses", "cover losses",
        "third-party claims", "third party claim",
    ],
    "Governing Law": [
        "governing law", "governed by", "jurisdiction", "applicable law",
        "laws of", "state of", "courts of", "venue", "choice of law",
        "subject to the laws",
    ],
    "Dispute Resolution": [
        "dispute", "arbitration", "arbitrator", "mediation", "mediator",
        "adr", "alternative dispute", "litigation", "lawsuit",
        "resolve disputes", "binding arbitration", "aaa rules",
        "jams", "icdr", "court of competent",
    ],
    "Renewal": [
        "renew", "renewal", "auto-renew", "automatically renew",
        "successive term", "evergreen", "rollover", "extension",
        "term shall renew", "unless terminated",
    ],
    "Obligations": [
        "shall", "must", "required to", "obligat", "duty", "responsible for",
        "undertakes to", "agrees to", "covenant", "warrant", "represent",
        "ensure", "guarantee", "perform", "deliver",
    ],
    "Intellectual Property": [
        "intellectual property", "ip", "copyright", "patent", "trademark",
        "license", "licence", "ownership", "proprietary rights",
        "work for hire", "moral rights", "assignment of ip",
    ],
    "Force Majeure": [
        "force majeure", "act of god", "beyond control", "natural disaster",
        "pandemic", "war", "strike", "government action", "unforeseeable",
        "circumstances beyond",
    ],
    "Non-Compete": [
        "non-compete", "non compete", "noncompete", "not compete",
        "competing business", "competitive activity", "solicit",
        "non-solicitation", "restraint of trade",
    ],
}

# ── Risk keyword patterns ─────────────────────────────────────────────────────

RISK_PATTERNS: list[dict[str, Any]] = [
    {
        "title": "Unlimited Liability",
        "severity": "High",
        "keywords": ["unlimited liability", "no cap on damages", "no limitation",
                     "unlimited damages", "no limit on liability"],
        "reason": "Contract contains language suggesting unlimited liability exposure.",
        "recommendation": "Negotiate a mutual liability cap equal to the contract value.",
    },
    {
        "title": "One-sided Indemnification",
        "severity": "High",
        "keywords": ["solely indemnify", "only party to indemnify", "one-sided indemnity",
                     "indemnify and hold harmless", "fully indemnify"],
        "reason": "Indemnification obligations appear to be one-sided.",
        "recommendation": "Negotiate mutual indemnification or cap the scope of indemnity.",
    },
    {
        "title": "Unilateral Amendment Rights",
        "severity": "High",
        "keywords": ["sole discretion", "unilaterally amend", "may change at any time",
                     "reserves the right to modify", "without notice"],
        "reason": "One party retains the right to amend the contract unilaterally.",
        "recommendation": "Require mutual written consent for any amendments.",
    },
    {
        "title": "Missing Dispute Resolution",
        "severity": "Medium",
        "keywords": [],  # Detected by absence — handled separately
        "reason": "No dispute resolution or arbitration clause detected.",
        "recommendation": "Add a clear dispute resolution mechanism (e.g., binding arbitration).",
        "detect_absence_of": "Dispute Resolution",
    },
    {
        "title": "Automatic Renewal Without Notice",
        "severity": "Medium",
        "keywords": ["automatically renew", "auto-renew", "unless cancelled",
                     "unless terminated prior", "evergreen", "rollover"],
        "reason": "Contract auto-renews without requiring explicit notice, which can lock parties in.",
        "recommendation": "Add a clear opt-out notice window (e.g., 30 days before renewal).",
    },
    {
        "title": "Broad Intellectual Property Assignment",
        "severity": "Medium",
        "keywords": ["assigns all rights", "all intellectual property", "work for hire",
                     "assigns all ip", "irrevocably assigns"],
        "reason": "The contract assigns very broad IP rights which may include pre-existing IP.",
        "recommendation": "Limit IP assignment to work specifically created under this contract.",
    },
    {
        "title": "Vague Payment Terms",
        "severity": "Medium",
        "keywords": ["reasonable time", "as agreed", "to be determined", "tbd",
                     "mutually agreed payment", "at our discretion"],
        "reason": "Payment terms are ambiguous or undefined, creating collection risk.",
        "recommendation": "Define specific payment amounts, due dates, and late payment penalties.",
    },
    {
        "title": "Excessive Confidentiality Scope",
        "severity": "Low",
        "keywords": ["all information", "any information disclosed",
                     "information of any kind", "without limitation"],
        "reason": "Confidentiality clause may be overly broad, covering all information exchanged.",
        "recommendation": "Limit confidentiality to specifically defined categories of information.",
    },
    {
        "title": "Long Notice Period",
        "severity": "Low",
        "keywords": ["180 days notice", "365 days notice", "one year notice",
                     "twelve months notice", "six months notice", "180-day notice"],
        "reason": "Termination requires an unusually long notice period.",
        "recommendation": "Negotiate a shorter notice period (e.g., 30–60 days).",
    },
    {
        "title": "No Governing Law Specified",
        "severity": "Low",
        "keywords": [],
        "reason": "No governing law clause detected, creating jurisdictional uncertainty.",
        "recommendation": "Add an explicit governing law and jurisdiction clause.",
        "detect_absence_of": "Governing Law",
    },
]


# ── Public API ────────────────────────────────────────────────────────────────

def extract_entities(text: str) -> dict[str, list[str]]:
    """
    Run spaCy NER on the document text.

    Returns a dict keyed by entity type, each holding a deduplicated
    list of extracted strings:
      {
        "PERSON": [...],
        "ORG":    [...],
        "DATE":   [...],
        "MONEY":  [...],
        "LOCATION": [...],
      }
    """
    nlp = _get_nlp()
    if nlp is None:
        return {"PERSON": [], "ORG": [], "DATE": [], "MONEY": [], "LOCATION": [],
                "error": "spaCy model not available"}

    # Work on first 50 K chars to avoid memory issues on huge documents
    sample = text[:50_000]
    doc = nlp(sample)

    bucket: dict[str, set[str]] = defaultdict(set)
    for ent in doc.ents:
        label = ent.label_
        val   = ent.text.strip()
        if not val or len(val) < 2:
            continue

        if label == "PERSON":
            bucket["PERSON"].add(val)
        elif label in ("ORG", "NORP"):
            bucket["ORG"].add(val)
        elif label == "DATE":
            # Filter noise: skip single digits or very short strings
            if re.search(r'\d', val) or len(val) > 4:
                bucket["DATE"].add(val)
        elif label == "MONEY":
            bucket["MONEY"].add(val)
        elif label in ("GPE", "LOC"):
            bucket["LOCATION"].add(val)

    # Deduplicate & sort each bucket
    return {
        "PERSON":   _dedup_sorted(bucket["PERSON"]),
        "ORG":      _dedup_sorted(bucket["ORG"]),
        "DATE":     _dedup_sorted(bucket["DATE"]),
        "MONEY":    _dedup_sorted(bucket["MONEY"]),
        "LOCATION": _dedup_sorted(bucket["LOCATION"]),
    }


def classify_clauses(text: str) -> list[dict[str, str]]:
    """
    Sentence-level clause classification using keyword matching.

    Returns a list of:
      { "text": <sentence>, "category": <category>, "score": <int> }

    Only sentences with a score ≥ 1 are returned.
    Useful for enriching LLM prompts with pre-identified clause labels.
    """
    nlp = _get_nlp()
    if nlp is None:
        # Fallback: simple sentence split on newlines
        sentences = [s.strip() for s in re.split(r'[\n.!?]+', text) if len(s.strip()) > 20]
    else:
        doc = nlp(text[:80_000])
        sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 20]

    results = []
    for sentence in sentences:
        lower = sentence.lower()
        best_cat, best_score = "General", 0

        for category, keywords in CLAUSE_PATTERNS.items():
            score = sum(1 for kw in keywords if kw in lower)
            if score > best_score:
                best_score = score
                best_cat = category

        if best_score >= 1:
            results.append({
                "text":     sentence[:300],   # truncate for JSON readability
                "category": best_cat,
                "score":    best_score,
            })

    return results


def screen_risks(text: str, classified_clauses: list[dict] | None = None) -> list[dict[str, str]]:
    """
    Pre-LLM keyword-based risk screening.

    Returns a list of detected risk dicts:
      { "title", "severity", "reason", "recommendation", "source": "nlp" }

    `classified_clauses` is the output of classify_clauses(); if supplied,
    absence-based risks (missing clause categories) are also detected.
    """
    lower = text.lower()
    found_categories: set[str] = set()

    if classified_clauses:
        found_categories = {c["category"] for c in classified_clauses}

    detected: list[dict[str, str]] = []
    seen_titles: set[str] = set()

    for pattern in RISK_PATTERNS:
        if pattern["title"] in seen_titles:
            continue

        # Absence-based detection
        if "detect_absence_of" in pattern:
            target_cat = pattern["detect_absence_of"]
            if target_cat not in found_categories and target_cat.lower() not in lower:
                detected.append({
                    "title":          pattern["title"],
                    "severity":       pattern["severity"],
                    "reason":         pattern["reason"],
                    "recommendation": pattern["recommendation"],
                    "source":         "nlp",
                })
                seen_titles.add(pattern["title"])
            continue

        # Keyword-based detection
        hits = [kw for kw in pattern["keywords"] if kw in lower]
        if hits:
            detected.append({
                "title":          pattern["title"],
                "severity":       pattern["severity"],
                "reason":         pattern["reason"],
                "recommendation": pattern["recommendation"],
                "source":         "nlp",
            })
            seen_titles.add(pattern["title"])

    return detected


def run_full_pipeline(text: str) -> dict:
    """
    Run the complete NLP pipeline in one call.

    Returns:
    {
      "entities":          { PERSON, ORG, DATE, MONEY, LOCATION },
      "classified_clauses": [ { text, category, score }, ... ],
      "nlp_risks":         [ { title, severity, reason, recommendation, source }, ... ],
      "clause_summary":    { category_name: count, ... }
    }
    """
    entities          = extract_entities(text)
    classified        = classify_clauses(text)
    nlp_risks         = screen_risks(text, classified_clauses=classified)

    # Aggregate clause category counts
    clause_summary: dict[str, int] = defaultdict(int)
    for item in classified:
        clause_summary[item["category"]] += 1

    return {
        "entities":           entities,
        "classified_clauses": classified,
        "nlp_risks":          nlp_risks,
        "clause_summary":     dict(clause_summary),
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _dedup_sorted(items: set[str]) -> list[str]:
    """Remove near-duplicates (same after lower-casing) and sort."""
    seen_lower: set[str] = set()
    result = []
    for item in sorted(items, key=lambda x: (-len(x), x)):   # prefer longer form
        lc = item.lower()
        if lc not in seen_lower:
            seen_lower.add(lc)
            result.append(item)
    return sorted(result)


def _build_nlp_context(pipeline_result: dict) -> str:
    """
    Convert NLP pipeline output into a compact text block
    suitable for injection into an LLM prompt.
    """
    lines = ["=== NLP Pre-Analysis ==="]

    entities = pipeline_result.get("entities", {})
    if entities.get("PERSON"):
        lines.append(f"Persons detected: {', '.join(entities['PERSON'][:10])}")
    if entities.get("ORG"):
        lines.append(f"Organizations detected: {', '.join(entities['ORG'][:10])}")
    if entities.get("DATE"):
        lines.append(f"Dates detected: {', '.join(entities['DATE'][:10])}")
    if entities.get("MONEY"):
        lines.append(f"Monetary values detected: {', '.join(entities['MONEY'][:10])}")
    if entities.get("LOCATION"):
        lines.append(f"Locations detected: {', '.join(entities['LOCATION'][:10])}")

    clause_summary = pipeline_result.get("clause_summary", {})
    if clause_summary:
        cats = ", ".join(f"{k}({v})" for k, v in sorted(clause_summary.items()))
        lines.append(f"Clause categories identified: {cats}")

    nlp_risks = pipeline_result.get("nlp_risks", [])
    if nlp_risks:
        lines.append("Pre-identified risk signals:")
        for r in nlp_risks:
            lines.append(f"  [{r['severity']}] {r['title']}: {r['reason']}")

    lines.append("=== End NLP Pre-Analysis ===")
    return "\n".join(lines)
