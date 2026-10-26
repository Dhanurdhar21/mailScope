# MailScope — Professional Email Deliverability Analyzer

![MailScope Brand](public/mailscope-icon.svg)

> **MailScope** is a production-grade SaaS web application and API service engineered to inspect email address deliverability evidence through deterministic RFC syntax validation, authoritative asynchronous DNS resolution, and mail exchange (MX) record routing analysis—**without sending intrusive test emails**.

Developed as a showcase frontend engineering, backend API architecture, and accessibility project.

---

## 🌟 Key Capabilities & Architectural Highlights

### 1. High-Performance Asynchronous Backend (FastAPI + dnspython)
- **Non-Blocking Async Resolution**: Uses `dns.asyncresolver.Resolver` with `asyncio.gather()` and an `asyncio.Semaphore` (max 25 concurrent lookups) to prevent socket exhaustion and keep the event loop responsive.
- **Batch-Level Domain Caching**: Addresses sharing the same domain within a batch (e.g., 50 addresses at `@example.com`) query DNS only once, dramatically reducing latency and network traffic.
- **RFC 7505 Null MX Detection**: Explicitly identifies domains publishing a Null MX (`.`) to advertise that they refuse all incoming mail, accurately classifying them as `likely_to_bounce`.
- **RFC 5321 Fallback Routing**: When no dedicated MX records exist, automatically evaluates A and AAAA host address records for implicit mail routing viability.
- **Deterministic Outcome Classification**: Distinguishes confirmed `NXDOMAIN` and empty routing from DNS timeouts and temporary `SERVFAIL`/`NoNameservers` conditions (classified truthfully as `unknown` rather than false hard bounces).

### 2. Comprehensive RFC 5321 / 5322 Syntax Validator
- Replaces naive regular expressions with a structured validator:
  - Enforces RFC 5321 length limits: total address &le; 254 chars, local-part &le; 64 chars, domain &le; 253 chars, domain labels &le; 63 chars.
  - Detects dot-atom violations: leading dots, trailing dots, and consecutive dots (`..`).
  - Supports RFC 5322 printable characters and plus-addressing (`user+tag@domain.com`).
  - Supports Internationalized Domain Names (IDN/Punycode) via RFC 5891 IDNA encoding (`kontakt@münchen.de` &rarr; `kontakt@xn--mnchen-3ya.de`).

### 3. Truthful 6-Stage Processing Pipeline
- **Stage 1 — Input Received**: Normalizes multi-delimiter entries (newlines, commas, semicolons, spaces) and deduplicates targets.
- **Stage 2 — Syntax Analysis**: Strict RFC validation and local-part constraint inspection.
- **Stage 3 — Domain Lookup**: Verifies authoritative DNS registration, detecting `NXDOMAIN` and network timeouts.
- **Stage 4 — Mail Routing Analysis**: Queries and sorts active MX records by preference, evaluating RFC 5321 A/AAAA fallback routing when MX records are absent.
- **Stage 5 — Classification**: Synthesizes network evidence into clear confidence states with transparent reasoning.
- **Stage 6 — Results Ready**: Displays interactive metrics, search/filtering, detailed drawer inspections, and CSV export.

### 4. Transparent Deliverability Taxonomy
- **`LIKELY TO BE DELIVERED`**: Syntax is valid and active MX servers are responding. *(Note: Mailbox existence cannot be guaranteed without real message transmission).*
- **`LIKELY TO BOUNCE`**: Definitive delivery problem identified (malformed RFC syntax, confirmed `NXDOMAIN`, RFC 7505 Null MX, or confirmed domain with no routing records).
- **`UNKNOWN / FALLBACK`**: Insufficient or ambiguous evidence (DNS timeouts, temporary server errors, or fallback A/AAAA routing without dedicated MX).

### 5. Production-Grade SaaS Interface & Design System
- **Restrained Light Theme**: Built using clean SaaS standards (`#F7F8FA` background, `#FFFFFF` surfaces, `#182230` primary text, `#667085` secondary text, `#315EFB` developer blue accent, `#E4E7EC` borders).
- **Accessible Indicators**: Statuses are never conveyed by color alone—distinct SVG icons, clear textual badges, and WCAG AA contrast standards are strictly enforced.
- **Real-Time Backend Health Monitoring**: Live ping against `GET /health` displays connection status with automatic retry and service metadata.
- **Secure CSV Export**: Full CSV generation with formula injection protection (CWE-1236 mitigation) escaping dangerous formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend API** | [FastAPI](https://fastapi.tiangolo.com) + [Uvicorn](https://www.uvicorn.org) |
| **DNS Engine** | [dnspython](https://www.dnspython.org) (`dns.asyncresolver`) |
| **Data Validation** | [Pydantic v2](https://docs.pydantic.dev) + [idna](https://github.com/kjd/idna) |
| **Backend Tests** | [pytest](https://docs.pytest.org) + [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio) + [httpx](https://www.python-httpx.org) |
| **Frontend Framework** | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) (Strict Mode) |
| **Build Tooling** | [Vite 8](https://vite.dev) + [`@tailwindcss/vite`](https://tailwindcss.com) |
| **Styling** | Tailwind CSS v4 + Vanilla CSS Design Tokens |
| **Routing** | [React Router v7](https://reactrouter.com) (`/`, `/dashboard`, `*` 404) |
| **Icons & Fonts** | [Lucide React](https://lucide.dev) + Inter & JetBrains Mono |

---

## 📁 Repository Structure

```
smtp/
├── backend/
│   ├── config.py            # Environment settings (CORS, timeouts, batch limits)
│   ├── dns_checker.py       # Async DNS resolver, RFC 7505 Null MX, A/AAAA fallback, caching
│   ├── main.py              # FastAPI application, lifecycle, health & analyze endpoints
│   ├── models.py            # Pydantic request/response schemas matching frontend types
│   ├── requirements.txt     # Python runtime & testing dependencies
│   └── syntax.py            # RFC 5321/5322 syntax validation, length rules, IDNA support
├── public/
│   ├── mailscope-icon.svg   # Custom SVG brand icon
│   └── favicon.svg          # Favicon
├── src/
│   ├── components/          # Reusable UI components (Button, ResultsTable, Modal, etc.)
│   ├── hooks/               # Custom React hooks (useAnalysis, useBackendHealth)
│   ├── pages/               # LandingPage, DashboardPage, NotFoundPage
│   ├── services/            # API client, CSV exporter, email input parser
│   ├── types/               # TypeScript interfaces (models, statuses, responses)
│   ├── App.tsx              # Router configuration
│   ├── index.css            # Tailwind CSS theme & tokens
│   └── main.tsx             # Frontend entry point
├── tests/
│   ├── conftest.py          # Pytest setup and path configuration
│   ├── test_api.py          # API endpoint tests (health, analyze, CORS, limits, errors)
│   ├── test_dns.py          # Deterministic unit tests with mocked DNS responses
│   ├── test_integration_dns.py # Live DNS integration tests
│   └── test_syntax.py       # Comprehensive syntax unit tests
├── .env                     # Local environment configuration
├── .env.example             # Environment configuration template
├── pytest.ini               # Pytest configuration
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **Python**: v3.10+ (v3.12/v3.14 recommended)

### Step 1: Install Python Dependencies
```bash
python -m pip install -r backend/requirements.txt
```

### Step 2: Start the FastAPI Backend
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
*The backend starts on `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.*

### Step 3: Start the Frontend Dev Server
In a separate terminal:
```bash
npm install
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

---

## 🧪 Running the Backend Test Suite

The test suite runs 28 deterministic unit and integration tests covering syntax rules, mocked DNS edge cases (Null MX, timeouts, fallback), API status codes, and schema compatibility:

```bash
python -m pytest -v
```

To run only the deterministic unit tests:
```bash
python -m pytest -m "not integration" -v
```

---

## 📡 API Reference & Contract

### 1. Health Check
`GET /health`
```json
{
  "status": "ok",
  "service": "mailscope-analyzer",
  "version": "1.0.0",
  "timestamp": 1793037584.11652,
  "dns_resolver": "active"
}
```

### 2. Deliverability Analysis
`POST /api/analyze`

**Request Body:**
```json
{
  "emails": [
    "contact@google.com",
    "bad..syntax@com",
    "user+tag@github.com",
    "test@nonexistentdomain-xyz-404-check.com"
  ]
}
```

**Response Body:**
```json
{
  "results": [
    {
      "email": "contact@google.com",
      "normalized_email": "contact@google.com",
      "syntax_valid": true,
      "domain": "google.com",
      "domain_status": "resolved",
      "mx_status": "present",
      "classification": "likely_to_be_delivered",
      "reason": "Domain 'google.com' resolves with 1 active MX record(s). Mail routing is technically configured.",
      "diagnostics": {
        "has_mx": true,
        "has_fallback_a": false,
        "mx_records": ["smtp.google.com (priority: 10)"],
        "is_disposable": false,
        "syntax_error": null,
        "response_time_ms": 27.65
      }
    }
  ],
  "summary": {
    "total": 4,
    "likely_to_be_delivered": 2,
    "likely_to_bounce": 2,
    "unknown": 0,
    "duration_ms": 115.42
  }
}
```

---

## 🌐 Production Deployment Guide (e.g., Render, Railway)

### Backend Deployment (Render Web Service)
- **Environment**: Python 3
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `CORS_ORIGINS`: Comma-separated list of allowed frontend origins (e.g., `https://mailscope.vercel.app`)
  - `DNS_TIMEOUT_SECONDS`: `2.5`
  - `MAX_EMAIL_BATCH_SIZE`: `200`

### Frontend Deployment (Vercel, Netlify, Render Static Site)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: URL of your deployed backend service (e.g., `https://mailscope-api.onrender.com`)
