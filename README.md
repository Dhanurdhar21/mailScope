# MailScope — Email Deliverability Analyzer

![MailScope Brand](public/mailscope-icon.svg)

**MailScope** is a web application that analyzes email addresses using syntax validation, DNS lookups, and Mail Exchange (MX) record analysis to assess whether their domains appear configured to receive email.

The application combines a React and TypeScript frontend with a Python FastAPI backend. It provides understandable classifications, technical explanations, domain-level diagnostics, and analysis results without sending test emails.

> **Important:** MailScope performs DNS-based analysis. It does not guarantee email delivery or independently confirm that an individual recipient's mailbox exists.

## Live Application

- **Frontend:** https://mail-scope-zeta.vercel.app
- **Backend API:** https://mailscope-backend.onrender.com
- **API documentation:** https://mailscope-backend.onrender.com/docs
- **Backend health check:** https://mailscope-backend.onrender.com/health
- **GitHub repository:** https://github.com/Dhanurdhar21/mailScope

## Key Features

### 1. Email Syntax Validation

MailScope checks email address formatting before performing domain-level analysis.

Validation can identify common formatting problems, including:

- Missing or misplaced `@` delimiters.
- Empty local parts or domain components.
- Consecutive dots and other invalid dot placement.
- Domain label and email length violations.
- Invalid domain formatting.

The implementation also supports applicable internationalized domain name handling.

Syntax validation establishes whether an address conforms to the application's validation rules; it does not establish that the mailbox exists.

### 2. DNS and Domain Analysis

MailScope uses Python's `dnspython` library to inspect DNS responses associated with an email domain.

Depending on the response, the application can distinguish between:

- A domain that resolves successfully.
- A domain that returns `NXDOMAIN`.
- A DNS lookup that times out.
- Other DNS resolution errors.
- Insufficient or ambiguous DNS evidence.

Temporary DNS failures are not equivalent to proof that a domain does not exist.

### 3. MX Record Analysis

Mail Exchange (MX) records identify the mail servers designated to receive email for a domain.

MailScope examines MX information to assess the domain's mail-routing configuration.

The analysis considers cases such as:

- **MX records present:** The domain has designated mail servers.
- **Null MX:** The domain explicitly indicates that it does not accept email.
- **No MX records:** The application may examine A or AAAA records to assess whether implicit mail routing could be possible.
- **DNS timeout or resolution failure:** The available evidence may be insufficient for a reliable classification.

MX records provide information about domain-level mail routing. They do not confirm the existence of a particular recipient's mailbox.

### 4. Deliverability Classification

MailScope presents its analysis using three primary classifications:

| Classification | Meaning |
|---|---|
| `likely_to_be_delivered` | The available evidence supports the possibility of email delivery, based on the application's analysis rules. |
| `likely_to_bounce` | The application has identified evidence suggesting a delivery problem, such as invalid syntax, a nonexistent domain, or Null MX. |
| `unknown` | The available evidence is insufficient, ambiguous, or affected by a DNS resolution problem. |

These classifications are assessments, not guarantees. Actual delivery depends on additional factors, including mailbox existence, recipient-server policies, sender reputation, and message filtering.

### 5. Analysis Results and Technical Explanations

The results interface presents information such as:

- Email address and detected domain.
- Syntax validation status.
- Domain resolution status.
- MX routing status.
- Overall classification.
- Technical explanation for the result.
- Additional diagnostic information where available.

This helps users understand the evidence behind a classification rather than relying on a simple valid-or-invalid label.

### 6. Batch Analysis and CSV Export

MailScope supports analyzing multiple email addresses through its batch-analysis workflow.

The application is configured with a maximum batch size of 200 addresses.

CSV export allows analysis results to be saved for further review. Exported data should reflect the actual results returned by the application.

CSV content intended for spreadsheet applications should be handled carefully to reduce the risk of formula injection.

### 7. Backend Health Monitoring

The frontend can check the backend's health through the `GET /health` endpoint.

This helps indicate whether the backend service is responding. A successful health check does not guarantee that every DNS query or analysis request will succeed.

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend framework | React | User interface |
| Programming language | TypeScript | Frontend types and application logic |
| Build tool | Vite | Frontend development and production builds |
| Styling | Tailwind CSS and CSS | Layout and visual design |
| Icons | Lucide React | Interface icons |
| Backend framework | FastAPI | HTTP API and request handling |
| ASGI server | Uvicorn | Running the Python backend |
| DNS analysis | dnspython | DNS and MX record queries |
| Data validation | Pydantic | Request and response validation |
| Domain name handling | idna | Internationalized domain name processing |
| Testing | pytest and related tools | Backend testing |

The exact installed versions are defined by the project's dependency and package configuration files.

## System Architecture

MailScope follows a frontend-backend architecture.

```text
                 User
                  |
                  v
        React + TypeScript UI
                  |
                  | HTTP requests
                  v
            FastAPI Backend
                  |
                  v
       Email Syntax Validation
                  |
                  v
          DNS / MX Analysis
                  |
                  v
       Classification and Results
                  |
                  v
         JSON API Response
                  |
                  v
       Results Display and Export
```

### Processing Workflow

1. **Input:** The user supplies one or more email addresses.
2. **Syntax validation:** The backend evaluates each address against its validation rules.
3. **Domain extraction:** The domain is identified for DNS analysis.
4. **DNS resolution:** The backend queries DNS for relevant domain information.
5. **Mail-routing analysis:** MX records and applicable fallback information are evaluated.
6. **Classification:** The backend interprets the available evidence.
7. **Results:** The frontend displays the classification, technical explanation, and available diagnostics.

## Repository Structure

The following is the documented high-level structure. Refer to the actual repository for the definitive list of files.

```text
mailScope/
├── backend/
│   ├── config.py
│   ├── dns_checker.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   └── syntax.py
├── public/
│   ├── mailscope-icon.svg
│   └── favicon.svg
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/
├── .env.example
├── package.json
├── pytest.ini
├── tsconfig.json
└── vite.config.ts
```

### Important Backend Files

| File | Responsibility |
|---|---|
| `backend/main.py` | FastAPI application and API endpoints |
| `backend/dns_checker.py` | DNS and mail-routing analysis |
| `backend/syntax.py` | Email syntax validation |
| `backend/models.py` | Request and response models |
| `backend/config.py` | Backend configuration |
| `backend/requirements.txt` | Python dependencies |

## Getting Started Locally

### Prerequisites

Install the following:

- Python compatible with the project's dependencies.
- Node.js and npm.
- Git, if cloning the repository.

### 1. Clone the Repository

```bash
git clone https://github.com/Dhanurdhar21/mailScope.git
cd mailScope
```

### 2. Install Backend Dependencies

From the repository root:

```bash
python -m pip install -r backend/requirements.txt
```

### 3. Configure Environment Variables

Review `.env.example` and configure the variables required by the application.

For local frontend development, the API base URL should point to the local backend:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Configure backend variables according to `backend/config.py` and the application's deployment settings.

Do not commit `.env` files containing credentials, tokens, or other secrets.

### 4. Start the Backend

From the repository root, run:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The local API should be available at:

- API base: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

### 5. Install Frontend Dependencies

Open a separate terminal in the repository root:

```bash
npm install
```

### 6. Configure the Frontend API URL

Create or update the frontend environment file used by your Vite configuration:

```env
VITE_API_BASE_URL=http://localhost:8000
```

The frontend should use the URL of the backend environment you want to access.

Restart the development server after changing environment variables.

### 7. Start the Frontend

```bash
npm run dev
```

Open the local URL displayed by Vite, typically:

http://localhost:5173

## API Reference

The following endpoints are available in the documented API contract. Consult the live API documentation for the current schemas and response details.

### 1. Backend Health Check

**Endpoint:** `GET /health`

Example request:

```bash
curl https://mailscope-backend.onrender.com/health
```

This endpoint reports the backend's health information.

The exact response fields depend on the deployed implementation.

### 2. Email Analysis

**Endpoint:** `POST /api/analyze`

Example request:

```json
{
  "emails": [
    "contact@gmail.com",
    "user+tag@example.org",
    "invalid..address@example.org"
  ]
}
```

Example command:

```bash
curl -X POST "https://mailscope-backend.onrender.com/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"emails":["contact@gmail.com","user+tag@example.org","invalid..address@example.org"]}'
```

The backend returns analysis results according to its response schema. Results may include syntax status, domain status, MX status, classification, technical reasoning, and available diagnostic details.

The exact response depends on the input and current DNS responses. The request above is an example and does not represent a stored or guaranteed result.

### Batch Size

The configured maximum batch size is 200 email addresses per request. Requests exceeding the configured limit may be rejected.

For the authoritative request and response schemas, open:

https://mailscope-backend.onrender.com/docs

## Running Tests

The repository includes a backend test suite. Tests may cover syntax validation, API behavior, and DNS scenarios, depending on the available test files.

From the repository root, install the dependencies and run:

```bash
python -m pytest -v
```

If the test suite separates live DNS integration tests from deterministic tests, the latter can be run separately using the project's pytest markers:

```bash
python -m pytest -m "not integration" -v
```

Use the actual test output when documenting test counts or success rates. Live DNS tests may depend on network connectivity and the current state of external DNS infrastructure.

## Deployment

MailScope's frontend and backend are deployed separately.

### Frontend — Vercel

- **Production URL:** https://mail-scope-zeta.vercel.app
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_BASE_URL`

For the production frontend, configure:

```env
VITE_API_BASE_URL=https://mailscope-backend.onrender.com
```

Vite environment variables are applied during the frontend build. Redeploy the frontend after changing production environment variables.

### Backend — Render

- **Production URL:** https://mailscope-backend.onrender.com
- **Build command:** `pip install -r backend/requirements.txt`
- **Start command:**

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Configure backend environment variables according to the application's configuration.

Examples of relevant settings include:

| Variable | Purpose |
|---|---|
| `CORS_ORIGINS` | Permitted frontend origins |
| `DNS_TIMEOUT_SECONDS` | DNS query timeout |
| `MAX_EMAIL_BATCH_SIZE` | Maximum number of addresses per batch |

Use the exact defaults and supported values defined in the backend configuration.

Ensure that the production CORS configuration permits the deployed frontend origin:

```text
https://mail-scope-zeta.vercel.app
```

## Limitations

MailScope is designed to assess email-domain configuration using syntax and DNS evidence. Its results should be interpreted within those boundaries.

- **Mailbox existence:** DNS and MX records do not prove that an individual mailbox exists.
- **Delivery guarantees:** A positive classification does not guarantee that a message will be accepted, delivered, or placed in the inbox.
- **Bounce predictions:** A negative classification is an assessment based on available evidence, not proof that every attempted message will bounce.
- **Temporary DNS failures:** Timeouts and transient resolver errors may prevent a reliable conclusion.
- **Recipient policies:** Mail servers may reject messages based on recipient policies, sender reputation, authentication, rate limits, or other controls.
- **Spam filtering:** DNS-based analysis cannot determine with certainty whether a message will be classified as spam.

MailScope does not claim to perform mailbox verification through SMTP unless such functionality is separately implemented and verified.

## Security and Responsible Use

- Do not commit secrets or local credentials to the repository.
- Configure CORS to permit only the required frontend origins.
- Validate incoming requests and enforce configured batch limits.
- Treat DNS responses as external data that may be incomplete or temporarily unavailable.
- Avoid submitting sensitive email lists to systems without appropriate authorization.
- Do not interpret domain-level results as proof that a particular person's email address exists.

## Future Enhancements

Possible future improvements include:

- Additional domain and email authentication diagnostics, such as SPF and DMARC analysis.
- More detailed historical analysis and comparison.
- Improved batch-processing feedback for large lists.
- Additional test coverage for DNS edge cases.
- Optional integrations with specialized email-validation services.
- More detailed performance monitoring and reporting.

These are potential enhancements, not claims about functionality already implemented.

## Conclusion

MailScope demonstrates how a web application can combine frontend development, API design, email syntax validation, and DNS-based mail-routing analysis into a practical deliverability assessment tool.

By interpreting DNS and MX record evidence and explaining the resulting classifications, the application helps users understand a domain's email configuration while clearly communicating the limitations of DNS-based verification.

## Links

- **Live application:** https://mail-scope-zeta.vercel.app
- **Backend API:** https://mailscope-backend.onrender.com
- **Interactive API documentation:** https://mailscope-backend.onrender.com/docs
- **GitHub repository:** https://github.com/Dhanurdhar21/mailScope
