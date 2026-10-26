# MailScope — Professional Email Deliverability Analyzer

![MailScope Brand](public/mailscope-icon.svg)

> **MailScope** is a production-quality SaaS web application engineered to inspect email address deliverability evidence through deterministic RFC syntax validation, authoritative DNS resolution, and mail exchange (MX) record routing analysis—**without sending intrusive test emails**.

Developed as a showcase frontend engineering, SaaS UI/UX architecture, and accessibility project.

---

## 🌟 Key Capabilities & Architectural Highlights

### 1. Truthful 6-Stage Processing Pipeline
Unlike simplistic checkers that fabricate progress or binary "valid/invalid" verdicts, MailScope visualizes the actual technical pipeline:
- **Stage 1 — Input Received**: Normalizes multi-delimiter entries (newlines, commas, semicolons, spaces) and deduplicates targets.
- **Stage 2 — Syntax Analysis**: Strict RFC 5322 validation across local-part, `@` delimiter, and domain structure.
- **Stage 3 — Domain Lookup**: Verifies authoritative DNS registration, detecting `NXDOMAIN` and network timeouts.
- **Stage 4 — Mail Routing Analysis**: Queries and sorts active MX records by preference, evaluating RFC 5321 A/AAAA fallback routing when MX records are absent.
- **Stage 5 — Classification**: Synthesizes network evidence into clear confidence states with transparent reasoning.
- **Stage 6 — Results Ready**: Displays interactive metrics, search/filtering, detailed drawer inspections, and CSV export.

### 2. Transparent Deliverability Taxonomy
MailScope avoids misleading "100% verified" claims:
- **`LIKELY TO BE DELIVERED`**: Syntax is valid and active MX servers are responding. *(Note: Mailbox existence cannot be guaranteed without real message transmission).*
- **`LIKELY TO BOUNCE`**: Definitive delivery problem identified (malformed RFC 5322 syntax or confirmed `NXDOMAIN`).
- **`UNKNOWN / FALLBACK`**: Insufficient or ambiguous evidence (DNS timeouts, server errors, or fallback A/AAAA routing without dedicated MX).

### 3. Production-Grade SaaS Interface & Design System
- **Restrained Light Theme**: Built using clean SaaS standards (`#F7F8FA` background, `#FFFFFF` surfaces, `#182230` primary text, `#315EFB` developer blue accent, `#E4E7EC` borders).
- **Accessible Indicators**: Statuses are never conveyed by color alone—distinct SVG icons, clear textual badges, and WCAG AA contrast standards are strictly enforced.
- **Real-Time Backend Health Monitoring**: Live ping against `GET /health` displays connection status with automatic retry and service metadata.
- **Secure CSV Export**: Full CSV generation with formula injection protection (CWE-1236 mitigation) escaping dangerous formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + TypeScript (Strict Mode) |
| **Build Tooling** | Vite 8 + `@tailwindcss/vite` |
| **Styling** | Tailwind CSS v4 + Vanilla CSS Design Tokens |
| **Routing** | React Router v7 (`/`, `/dashboard`, `*` 404) |
| **Icons** | Lucide React |
| **Typography** | Inter & JetBrains Mono (Google Fonts) |
| **Backend Integration** | Native Fetch API with `AbortController` request cancellation |
| **Companion Backend** | FastAPI + Python `dnspython` + `uvicorn` |

---

## 📁 Repository Structure

```
smtp/
├── backend/
│   ├── main.py              # FastAPI deliverability analysis API (DNS, MX, RFC parsing)
│   └── requirements.txt     # Python dependencies (fastapi, uvicorn, dnspython, pydantic)
├── public/
│   ├── mailscope-icon.svg   # Custom SVG brand icon
│   └── favicon.svg          # Favicon
├── src/
│   ├── components/
│   │   ├── Button.tsx             # Accessible button with variants & loading state
│   │   ├── EmailInput.tsx         # Multiline input, sample loader, live counter
│   │   ├── EmptyState.tsx         # Clean zero-result & search miss states
│   │   ├── Footer.tsx             # Brand footer with technical disclaimer
│   │   ├── Navbar.tsx             # Responsive navbar with mobile drawer
│   │   ├── ProcessingTimeline.tsx # Truthful 6-stage animated pipeline
│   │   ├── ResultDetails.tsx      # Comprehensive modal/drawer for DNS evidence
│   │   ├── ResultsFilters.tsx     # Classification tabs & search bar
│   │   ├── ResultsTable.tsx       # Responsive SaaS data table
│   │   ├── StatusBadge.tsx        # High-contrast accessible status badges
│   │   ├── SummaryCard.tsx        # Metric summary cards with percentage shares
│   │   └── Toast.tsx              # ARIA live notification toasts
│   ├── hooks/
│   │   ├── useAnalysis.ts         # Pipeline state, filters, results coordinator
│   │   └── useBackendHealth.ts    # Live health check hook with auto-retry
│   ├── pages/
│   │   ├── DashboardPage.tsx      # Main analysis workspace
│   │   ├── LandingPage.tsx        # Conversion-focused SaaS landing page
│   │   └── NotFoundPage.tsx       # 404 error page
│   ├── services/
│   │   ├── api.ts                 # Fetch client, response adapter, error handling
│   │   ├── csvExport.ts           # RFC 4180 CSV builder with formula sanitization
│   │   └── emailParser.ts         # Delimiter parser, deduplicator, sample sets
│   ├── types/
│   │   └── analysis.ts            # Strongly-typed models & interfaces
│   ├── App.tsx                    # Route definitions and layout wrapper
│   ├── index.css                  # Tailwind CSS theme & tokens
│   └── main.tsx                   # Application entry point
├── .env                           # Environment configuration
├── .env.example                   # Environment configuration template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **Python**: v3.10+ (for running the companion FastAPI backend)

### Step 1: Install Frontend Dependencies
```bash
npm install
```

### Step 2: Start the FastAPI Backend
In a separate terminal:
```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
*The backend exposes `GET /health` and `POST /api/analyze` with CORS enabled.*

### Step 3: Start the Vite Dev Server
```bash
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

---

## ⚙️ Environment Configuration

Configure the backend API URL using the `VITE_API_BASE_URL` environment variable in `.env`:

```env
# MailScope API Endpoint
VITE_API_BASE_URL=http://localhost:8000
```

---

## 📡 Backend API Contract

### 1. Health Check
`GET /health`
```json
{
  "status": "ok",
  "service": "mailscope-analyzer",
  "version": "1.0.0",
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
    "invalid-format",
    "user@nonexistentdomain12345xyz.com"
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
      "reason": "Domain resolves with 1 active MX record(s). Delivery route is technically configured.",
      "diagnostics": {
        "has_mx": true,
        "has_fallback_a": false,
        "mx_records": ["smtp.google.com (priority: 10)"],
        "is_disposable": false,
        "syntax_error": null,
        "response_time_ms": 204.33
      }
    }
  ],
  "summary": {
    "total": 1,
    "likely_to_be_delivered": 1,
    "likely_to_bounce": 0,
    "unknown": 0,
    "duration_ms": 204.33
  }
}
```

---

## 🧪 Quality & Production Verification

- **Production Build**: Verified with `npm run build` (`tsc -b && vite build` completes in <700ms).
- **Linter**: Passed with `npm run lint` (0 errors, 0 warnings).
- **Automated E2E Browser Testing**: Validated landing page navigation, real DNS inspection, live filtering, inspection modal, and CSV export.

---

## 🛡️ Security & Privacy Notice
- **Non-intrusive**: MailScope executes strictly read-only DNS queries. It never sends test emails, SMTP `VRFY` commands, or ping packets to recipient inboxes.
- **Injection Protection**: Exported CSV files strictly sanitize formula injection vulnerabilities (`=`, `@`, `+`, `-`).
