import os
import logging
from dotenv import load_dotenv
from groq import Groq
from utils import safe_parse_json, truncate_text
import nlp_service

logger = logging.getLogger(__name__)

load_dotenv()

# ── Client ────────────────────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "llama-3.3-70b-versatile"

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is not set.")

_client = Groq(api_key=GROQ_API_KEY)

def _chat(system: str, user: str, temperature: float = 0.2) -> str:
    """Single-turn chat completion. Returns the raw content string from the model."""
    response = _client.chat.completions.create(
        model=MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content.strip()


# ── System Prompts ────────────────────────────────────────────────────────────

_DETECT_SYSTEM = (
    "You are a document classification expert. "
    "Determine the type of document provided and respond in JSON only. "
    "Return exactly one JSON object with two keys: "
    "'doc_type' (e.g. 'Legal Contract', 'Resume', 'Invoice', 'Research Paper', 'Letter', 'Report', 'Other') "
    "and 'is_legal_contract' (boolean — true only if this is a legal contract or agreement). "
    "Return ONLY valid JSON — no prose, no markdown fences."
)

_SUMMARY_SYSTEM = (
    "You are an experienced legal analyst and business advisor. "
    "Your job is to read legal contracts and summarize them in plain, simple English "
    "that any business stakeholder — not just lawyers — can understand. "
    "Be concise, accurate, and highlight what really matters."
)

_GENERIC_SUMMARY_SYSTEM = (
    "You are a helpful document analyst. "
    "Summarize the provided document clearly and concisely. "
    "Adapt your analysis to the document type — for a resume, highlight skills and experience; "
    "for an invoice, highlight amounts and parties; for a report, highlight key findings. "
    "Be accurate and well-structured."
)

_CLAUSES_SYSTEM = (
    "You are an expert legal document analyst. "
    "Extract specific legal clauses from the contract and return them as a JSON array. "
    "Each element must have exactly THREE keys: "
    "'clause_name' (the specific clause name), "
    "'category' (one of: Payment, Termination, Confidentiality, Liability, Indemnity, "
    "Governing Law, Dispute Resolution, Renewal, Obligations, Intellectual Property, "
    "Force Majeure, Non-Compete, General), "
    "'description' (a clear explanation of what this clause says). "
    "Focus on all significant clauses present in the document. "
    "Return ONLY valid JSON — no prose, no markdown fences."
)

_RISKS_SYSTEM = (
    "You are a senior legal risk analyst. "
    "Identify all legal risks in the provided contract. "
    "For each risk, assess the severity (High / Medium / Low). "
    "Return a JSON object with two keys: "
    "'risks' (an array) and 'risk_score' (an integer 0-100 representing overall contract risk, "
    "where 0=no risk and 100=extremely high risk). "
    "Each risk object must have exactly these keys: "
    "'title', 'severity', 'reason', 'recommendation'. "
    "Examples of risks: unlimited liability, missing termination clause, "
    "one-sided indemnity, ambiguous payment terms, very long notice periods, "
    "unilateral amendment rights, missing dispute resolution mechanism. "
    "Return ONLY valid JSON — no prose, no markdown fences."
)

_COMPARE_SYSTEM = (
    "You are a meticulous legal contract comparison specialist. "
    "Compare the two contracts provided and identify all meaningful differences. "
    "Return a JSON object with two keys: "
    "'comparison' (an array of difference rows) and "
    "'summary' (a 2-4 sentence plain-English summary of the key differences). "
    "Each row in 'comparison' must have exactly these keys: "
    "'category' (e.g. Payment Terms, Termination, Liability, Dates, Obligations, Parties), "
    "'contract_1' (what Contract 1 says — use 'Not present' if missing), "
    "'contract_2' (what Contract 2 says — use 'Not present' if missing), "
    "'change_type' (one of: Added, Removed, Modified — "
    "  Added = present in Contract 2 but not Contract 1, "
    "  Removed = present in Contract 1 but not Contract 2, "
    "  Modified = different in both), "
    "'significance' (High / Medium / Low — how important is this difference). "
    "Return ONLY valid JSON — no prose, no markdown fences."
)


# ── Public API ────────────────────────────────────────────────────────────────

def detect_document_type(text: str) -> dict:
    """
    Detect whether the document is a legal contract or something else.
    Returns: { doc_type: str, is_legal_contract: bool }
    """
    sample = truncate_text(text, max_chars=3000)  # Only need a sample to classify
    user_prompt = f"""Classify the type of this document.

DOCUMENT SAMPLE:
\"\"\"
{sample}
\"\"\"

Return JSON like: {{"doc_type": "Legal Contract", "is_legal_contract": true}}"""

    raw = _chat(_DETECT_SYSTEM, user_prompt, temperature=0.1)
    try:
        data = safe_parse_json(raw)
        if isinstance(data, dict) and "doc_type" in data:
            return {
                "doc_type": str(data.get("doc_type", "Document")),
                "is_legal_contract": bool(data.get("is_legal_contract", False)),
            }
    except Exception:
        pass
    # Fallback: keyword-based heuristic
    legal_keywords = ["agreement", "contract", "whereas", "party", "parties", "indemnify",
                      "liability", "termination", "governing law", "dispute", "obligation"]
    lower = text[:3000].lower()
    hit_count = sum(1 for kw in legal_keywords if kw in lower)
    return {
        "doc_type": "Legal Contract" if hit_count >= 3 else "Document",
        "is_legal_contract": hit_count >= 3,
    }


def generate_summary(text: str) -> dict:
    """
    Generate a summary. Detects doc type first.
    For legal contracts → structured legal summary.
    For other documents → generic adaptive summary.
    Returns: { summary, doc_type, is_legal_contract }
    """
    doc_info = detect_document_type(text)
    text = truncate_text(text)

    if doc_info["is_legal_contract"]:
        user_prompt = f"""Analyze this legal document and provide a structured summary with these sections:

1. **Purpose** — What is this contract for?
2. **Parties Involved** — Who are the parties and their roles?
3. **Important Dates** — Effective date, expiry date, milestones, deadlines.
4. **Key Obligations** — What must each party do?
5. **Termination** — How can this contract be ended?
6. **Payment Terms** — Any financial terms, amounts, schedules.
7. **Plain English Explanation** — Explain the whole thing in 3-5 sentences a non-lawyer would understand.

CONTRACT TEXT:
\"\"\"
{text}
\"\"\"

Format your response with clear section headers and bullet points."""
        content = _chat(_SUMMARY_SYSTEM, user_prompt, temperature=0.3)
    else:
        user_prompt = f"""Analyze this document (type: {doc_info['doc_type']}) and provide a clear, structured summary.

Adapt your analysis to the document type. Use relevant section headers with **bold** formatting.

DOCUMENT TEXT:
\"\"\"
{text}
\"\"\"

Format your response with clear section headers and bullet points."""
        content = _chat(_GENERIC_SUMMARY_SYSTEM, user_prompt, temperature=0.3)

    return {
        "summary": content,
        "doc_type": doc_info["doc_type"],
        "is_legal_contract": doc_info["is_legal_contract"],
    }


def extract_clauses(text: str) -> list:
    """
    Return a list of {clause_name, category, description} dicts.
    NLP pre-classification is injected into the prompt as context so the LLM
    produces better-aligned category labels.
    """
    raw_text = truncate_text(text)

    # ── NLP pre-classification ──
    try:
        nlp_result = nlp_service.run_full_pipeline(text)
        nlp_ctx    = nlp_service._build_nlp_context(nlp_result)
    except Exception as exc:
        logger.warning("NLP pipeline failed (clause): %s", exc)
        nlp_ctx = ""

    user_prompt = f"""Extract all legal clauses from the following contract.

{nlp_ctx}

CONTRACT TEXT:
\"\"\"
{raw_text}
\"\"\"

Return a JSON array like:
[
  {{
    "clause_name": "Non-Disclosure Obligation",
    "category": "Confidentiality",
    "description": "Both parties agree not to disclose..."
  }},
  {{
    "clause_name": "Payment Schedule",
    "category": "Payment",
    "description": "Payments are due on the 1st of each month..."
  }}
]"""

    raw = _chat(_CLAUSES_SYSTEM, user_prompt)
    data = safe_parse_json(raw)
    if not isinstance(data, list):
        raise ValueError("AI returned unexpected clause format.")
    for item in data:
        if "category" not in item:
            item["category"] = "General"
    return data


def detect_risks(text: str) -> dict:
    """
    Return { risks: [...], risk_score: int, nlp_risks: [...] }.
    nlp_risks are pre-LLM signals; risks are the full LLM analysis.
    """
    raw_text = truncate_text(text)

    # ── NLP pre-screening ──
    try:
        nlp_result = nlp_service.run_full_pipeline(text)
        nlp_ctx    = nlp_service._build_nlp_context(nlp_result)
        nlp_risks  = nlp_result.get("nlp_risks", [])
    except Exception as exc:
        logger.warning("NLP pipeline failed (risks): %s", exc)
        nlp_ctx   = ""
        nlp_risks = []

    user_prompt = f"""Analyze the following contract for legal risks.

{nlp_ctx}

CONTRACT TEXT:
\"\"\"
{raw_text}
\"\"\"

Return a JSON object like:
{{
  "risk_score": 72,
  "risks": [
    {{
      "title": "Unlimited Liability Exposure",
      "severity": "High",
      "reason": "The contract places no cap on damages...",
      "recommendation": "Negotiate a liability cap equal to contract value."
    }}
  ]
}}"""

    raw = _chat(_RISKS_SYSTEM, user_prompt)
    data = safe_parse_json(raw)

    if isinstance(data, list):
        llm_risks = data
        score = _compute_score(data)
    elif isinstance(data, dict):
        llm_risks = data.get("risks", [])
        score = data.get("risk_score")
        if score is None:
            score = _compute_score(llm_risks)
        score = int(score)
    else:
        raise ValueError("AI returned unexpected risk format.")

    return {
        "risks":      llm_risks,
        "risk_score": score,
        "nlp_risks":  nlp_risks,
    }


def _compute_score(risks: list) -> int:
    """Fallback risk score computation from severity counts."""
    if not risks:
        return 0
    weights = {"high": 20, "medium": 8, "low": 3}
    total = sum(weights.get(r.get("severity", "").lower(), 5) for r in risks)
    return min(100, total)


def compare_contracts(text1: str, text2: str) -> dict:
    """
    Return { comparison: [...rows], summary: str, file1: str, file2: str }.
    Each row has: category, contract_1, contract_2, change_type, significance.
    """
    text1 = truncate_text(text1, max_chars=45_000)
    text2 = truncate_text(text2, max_chars=45_000)
    user_prompt = f"""Compare these two legal contracts and identify all differences.

CONTRACT 1:
\"\"\"
{text1}
\"\"\"

CONTRACT 2:
\"\"\"
{text2}
\"\"\"

Return a JSON object like:
{{
  "summary": "Contract 2 significantly reduces the payment terms and removes the arbitration clause...",
  "comparison": [
    {{
      "category": "Payment Terms",
      "contract_1": "Monthly payment of $5,000 due on the 1st.",
      "contract_2": "Quarterly payment of $12,000 due within 30 days.",
      "change_type": "Modified",
      "significance": "High"
    }},
    {{
      "category": "Arbitration",
      "contract_1": "All disputes resolved by binding arbitration.",
      "contract_2": "Not present",
      "change_type": "Removed",
      "significance": "High"
    }}
  ]
}}"""

    raw = _chat(_COMPARE_SYSTEM, user_prompt, temperature=0.1)
    data = safe_parse_json(raw)

    # Handle old list format (backward compat)
    if isinstance(data, list):
        return {"comparison": data, "summary": ""}
    if isinstance(data, dict):
        rows = data.get("comparison", [])
        # Ensure every row has change_type
        for row in rows:
            if "change_type" not in row:
                c1 = str(row.get("contract_1", "")).lower()
                c2 = str(row.get("contract_2", "")).lower()
                if "not present" in c1:
                    row["change_type"] = "Added"
                elif "not present" in c2:
                    row["change_type"] = "Removed"
                else:
                    row["change_type"] = "Modified"
        return {
            "comparison": rows,
            "summary": data.get("summary", ""),
        }
    raise ValueError("AI returned unexpected comparison format.")
