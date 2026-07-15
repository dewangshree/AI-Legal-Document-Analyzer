# ⚖️ AI Legal Document Analyzer

An AI-powered legal document analysis tool built with **FastAPI + Groq (LLaMA 3.3 70B)** on the backend and **React + Vite + Tailwind CSS** on the frontend.

---

## Features

| Feature | Description |
|---|---|
| 📄 **Document Upload** | PDF, DOCX, TXT — up to 20 MB |
| ✨ **AI Summary** | Purpose, parties, dates, obligations, payment terms, plain English |
| 📋 **Clause Extraction** | Confidentiality, Termination, Payment, Liability, Indemnity, IP, and more |
| 🛡️ **Risk Detection** | High / Medium / Low severity with reasons and recommendations |
| 🔀 **Contract Comparison** | Side-by-side diff table with impact ratings |

---

## Project Structure

```
legal-analyzer/
├── backend/
│   ├── app.py             ← FastAPI application (5 endpoints)
│   ├── groq_service.py    ← Groq LLM calls + prompt engineering
│   ├── parser.py          ← PDF / DOCX / TXT text extraction
│   ├── utils.py           ← Shared helpers
│   ├── requirements.txt
│   └── venv/              ← Python virtual environment
│
└── frontend/
    ├── src/
    │   ├── App.jsx              ← Main application
    │   ├── api.js               ← Axios API client
    │   ├── index.css            ← Global Tailwind styles
    │   └── components/
    │       ├── Header.jsx
    │       ├── UploadZone.jsx
    │       ├── SummarySection.jsx
    │       ├── ClausesSection.jsx
    │       ├── RisksSection.jsx
    │       └── CompareSection.jsx
    ├── tailwind.config.js
    └── package.json
```

---

## Running the App

### Backend

```bash
cd backend
source venv/bin/activate     # activate virtual env
uvicorn app:app --reload     # starts on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install                  # first time only
npm run dev                  # starts on http://localhost:5173
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/upload` | Extract text from document |
| `POST` | `/summary` | Generate AI summary |
| `POST` | `/clauses` | Extract legal clauses |
| `POST` | `/risks` | Detect legal risks |
| `POST` | `/compare` | Compare two contracts |

All `POST` endpoints accept `multipart/form-data` with file field(s).

---

## Tech Stack

- **Backend**: Python · FastAPI · Groq · pdfplumber · PyMuPDF · python-docx
- **Frontend**: React 18 · Vite · Tailwind CSS · Axios · react-hot-toast · lucide-react
- **AI Model**: LLaMA 3.3 70B Versatile via Groq API
