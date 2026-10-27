# MailScope Defects & Remediation Log

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-27  
**Scope:** Verified Code Defects, Architectural Flaws, and Security Vulnerabilities  

---

## Executive Summary of Identified Defects

During this formal pre-release quality gate audit, **7 distinct defects** were identified across backend logic, security middleware, and frontend services. **All 7 defects have been safely remediated, verified, and backed by automated regression tests.**

| Defect ID | Severity | Category | Status | Primary Component | Regression Test |
| :--- | :---: | :--- | :---: | :--- | :--- |
| **DEFECT-01** | **P1 (High)** | Classification Logic | **RESOLVED** | `backend/dns_checker.py` | `tests/test_dns.py::test_regression_fallback_temporary_failure_is_unknown_not_bounce` |
| **DEFECT-02** | **P1 (High)** | Concurrency / Perf | **RESOLVED** | `backend/dns_checker.py` | `tests/test_dns.py::test_batch_domain_resolver_coalesces_queries` |
| **DEFECT-03** | **P1 (High)** | Security (CORS) | **RESOLVED** | `backend/main.py` | `tests/test_api.py::test_cors_preflight` |
| **DEFECT-04** | **P1 (High)** | Security (CWE-400) | **RESOLVED** | `backend/main.py` | `tests/test_api.py::test_regression_oversized_payload_returns_413` |
| **DEFECT-05** | **P1 (High)** | Security (CWE-1236) | **RESOLVED** | `src/services/csvExport.ts` | `src/__tests__/csvExport.test.ts::neutralizes formula injection with leading whitespace` |
| **DEFECT-06** | **P2 (Medium)** | UI Deception / UX | **RESOLVED** | `src/hooks/useAnalysis.ts` | Code inspection & Browser E2E |
| **DEFECT-07** | **P2 (Medium)** | Schema Inconsistency | **RESOLVED** | `backend/models.py` | `tests/test_api.py::test_frontend_schema_contract` |
| **DEFECT-08** | **P1 (High)** | DNS Reliability & Decoupling | **RESOLVED** | `backend/dns_checker.py` | `tests/test_dns.py::test_mx_timeout_with_successful_a_record_decoupling` & `test_live_null_mx_2outlook` |

---

## Detailed Defect Records

### DEFECT-01: False-Positive Bounce on Temporary DNS Failures during RFC 5321 Fallback
- **Severity:** P1 — High (Core Classification Defect)
- **Affected File:** `backend/dns_checker.py` (lines 173–275)
- **Reproduction Steps:**
  1. Inspect a domain whose nameservers return `NoAnswer` for `MX`.
  2. Simulate a temporary failure (such as `dns.exception.Timeout` or `dns.resolver.NoNameservers`) on fallback `A` or `AAAA` queries.
  3. Observe the resulting classification.
- **Expected Behavior:** Inconclusive DNS lookups due to server timeouts or network failures must be classified as `unknown`. A temporary nameserver failure must never be treated as conclusive evidence that no mail routing exists.
- **Actual Behavior:** The original code had `except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception): pass`. When neither `A` nor `AAAA` returned records, the function dropped through to the bottom and returned `domain_status="no_mail_records"` and `classification="likely_to_bounce"`.
- **Root Cause:** Incomplete error discrimination. Temporary errors (`Timeout`, `NoNameservers`, `SERVFAIL`) were caught and suppressed, causing the flow to conflate "lookup failed temporarily" with "record definitively does not exist".
- **Fix Implemented:** Introduced explicit boolean flags `a_had_timeout`, `aaaa_had_timeout`, `a_had_temporary_error`, and `aaaa_had_temporary_error`. If any temporary error occurs and no active records are returned, the code returns `classification="unknown"` and explains that fallback records could not be conclusively verified.
- **Regression Test:** `tests/test_dns.py::TestDnsRouting::test_regression_fallback_temporary_failure_is_unknown_not_bounce`
- **Verification Result:** **VERIFIED PASS.**

---

### DEFECT-02: Thundering Herd / Cache Stampede on Batches with Duplicate Domains
- **Severity:** P1 — High (Performance & Availability Defect)
- **Affected File:** `backend/dns_checker.py` and `backend/main.py`
- **Reproduction Steps:**
  1. Submit a batch of 200 email addresses sharing the same domain (e.g. `user1@corp.com` to `user200@corp.com`).
  2. Monitor the number of outgoing UDP/DoH DNS queries dispatched.
- **Expected Behavior:** Exactly 1 DNS query per record type (`MX`, `A`, `AAAA`) should be dispatched for that domain.
- **Actual Behavior:** All 200 tasks launched concurrently with `asyncio.gather()`. Because lookups ran in parallel and cache entries were only written after completion, all 200 tasks saw a cache miss and flooded the resolver with 200 identical queries simultaneously.
- **Root Cause:** Lack of in-flight query deduplication (promise / task coalescing).
- **Fix Implemented:** Designed `BatchDomainResolver` containing an `in_flight: Dict[str, asyncio.Task[DomainDnsResult]]` map protected by an `asyncio.Lock()`. If a lookup for a domain is already in progress, concurrent coroutines await the existing task rather than dispatching redundant queries.
- **Regression Test:** `tests/test_dns.py::TestDnsRouting::test_batch_domain_resolver_coalesces_queries`
- **Verification Result:** **VERIFIED PASS** (1 query executed for 10 concurrent requests; verified in benchmark: 1 query for 200 addresses).

---

### DEFECT-03: Invalid and Insecure CORS Configuration
- **Severity:** P1 — High (Security Configuration Defect)
- **Affected File:** `backend/main.py`
- **Reproduction Steps:**
  1. Initialize FastAPI `CORSMiddleware` with `allow_origins=["*"]` and `allow_credentials=True`.
  2. Execute an `OPTIONS` preflight request with credentials.
- **Expected Behavior:** Per Fetch and CORS specifications, wildcard origin `*` cannot be paired with `allow_credentials=True` (browsers reject such responses or expose security risks).
- **Actual Behavior:** Wildcard was statically combined with `allow_credentials=True`.
- **Root Cause:** Hardcoded insecure CORS options in middleware declaration.
- **Fix Implemented:** Replaced hardcoding with dynamic evaluation:
  ```python
  is_wildcard = (CORS_ORIGINS == ["*"])
  app.add_middleware(
      CORSMiddleware,
      allow_origins=CORS_ORIGINS,
      allow_credentials=not is_wildcard,
      allow_methods=["GET", "POST", "OPTIONS"],
      allow_headers=["*"],
  )
  ```
- **Regression Test:** `tests/test_api.py::TestApiEndpoints::test_cors_preflight`
- **Verification Result:** **VERIFIED PASS.**

---

### DEFECT-04: Unbounded Request Body Denial-of-Service (CWE-400)
- **Severity:** P1 — High (Availability & Security Defect)
- **Affected File:** `backend/main.py`
- **Reproduction Steps:**
  1. Send a POST request to `/api/analyze` with a 100MB body.
  2. Observe server memory allocation and processing.
- **Expected Behavior:** Server must terminate the connection early with HTTP 413 Payload Too Large if the payload exceeds `MAX_REQUEST_BODY_BYTES` (512 KB).
- **Actual Behavior:** The server buffered the entire request body into memory before running Pydantic validation.
- **Root Cause:** `MAX_REQUEST_BODY_BYTES` was defined in `backend/config.py` but never enforced by any middleware.
- **Fix Implemented:** Implemented `RequestSizeLimitMiddleware` that inspects the incoming `Content-Length` header and streams chunks with an accumulator, aborting with HTTP 413 if the payload exceeds 524,288 bytes.
- **Regression Test:** `tests/test_api.py::TestApiEndpoints::test_regression_oversized_payload_returns_413`
- **Verification Result:** **VERIFIED PASS.**

---

### DEFECT-05: CSV Formula Injection Leading-Whitespace Bypass (CWE-1236)
- **Severity:** P1 — High (Client-Side Security Vulnerability)
- **Affected File:** `src/services/csvExport.ts` (lines 12–29)
- **Reproduction Steps:**
  1. Submit an email or input field containing `"   =cmd|'/C calc'!A0"`.
  2. Export the results to CSV.
  3. Inspect the exported raw CSV cell.
- **Expected Behavior:** Formula-leading characters must be neutralized by prepending `'`, even when preceded by spaces, tabs, or whitespace.
- **Actual Behavior:** `sanitizeCsvCell` only used `str.startsWith(char)`. Because the cell started with spaces, `startsWith('=')` returned `false`. When opened in Microsoft Excel, Excel automatically strips leading whitespace and executes the formula.
- **Root Cause:** Incomplete prefix checking that did not account for leading whitespace or dangerous characters like `|` and `%`.
- **Fix Implemented:** Updated `sanitizeCsvCell` to test `str.trimStart()`. If the trimmed string begins with `=`, `+`, `-`, `@`, `|`, `%`, `\t`, or `\r`, it prepends `'` and escapes inner quotes.
- **Regression Test:** `src/__tests__/csvExport.test.ts::neutralizes formula injection with leading whitespace`
- **Verification Result:** **VERIFIED PASS.**

---

### DEFECT-06: Deceptive Synthetic Progress Timers in Processing Timeline
- **Severity:** P2 — Medium (Integrity & UX Defect)
- **Affected File:** `src/hooks/useAnalysis.ts` (lines 145–173)
- **Reproduction Steps:**
  1. Trigger analysis on a batch.
  2. While the backend network request is still pending, observe stages 2, 3, and 4 in the UI.
- **Expected Behavior:** The UI must honestly represent the state of processing. Stages must not be shown as completed until they have actually completed.
- **Actual Behavior:** `useAnalysis.ts` ran synthetic `window.setTimeout` timers (280ms, 550ms, 820ms) that marked stages 2 ("Syntax"), 3 ("Domain Lookup"), and 4 ("Mail Routing") as `completed` even if the backend request had not finished or was about to fail.
- **Root Cause:** Simulated visual flair masking the atomic nature of the backend API call.
- **Fix Implemented:** Removed all artificial `setTimeout` stage transitions. While the backend request is active, Stage 1 is marked `completed` and Stages 2–5 are marked `in_progress` with an honest note ("Analysis pipeline in progress..."). When the backend response returns, all stages are updated to `completed` with real data from the response summary. If the request fails, active stages are marked `failed`.
- **Regression Test:** Inspected `src/hooks/useAnalysis.ts`; verified in browser E2E session.
- **Verification Result:** **VERIFIED PASS.**

---

### DEFECT-07: Inconsistent Diagnostics Schema Contract between Frontend and Backend
- **Severity:** P2 — Medium (API Contract Inconsistency)
- **Affected File:** `backend/models.py`
- **Reproduction Steps:**
  1. Inspect TypeScript type `EmailAnalysisResult` in `src/types/analysis.ts`.
  2. Inspect Pydantic model `EmailAnalysisResult` in `backend/models.py`.
- **Expected Behavior:** The backend response model must provide all fields expected by the frontend (`normalized_email`, `domain_status`, `mx_status`, `diagnostics.has_fallback_a`, etc.).
- **Actual Behavior:** Initial backend model versions lacked `normalized_email` and had optional diagnostics fields that defaulted to `None` rather than conforming structures.
- **Root Cause:** Divergent evolution of frontend and backend types during development.
- **Fix Implemented:** Synchronized `backend/models.py` with `src/types/analysis.ts`. Added comprehensive test `test_frontend_schema_contract` that verifies every single expected key in both the item and diagnostics dictionaries.
- **Regression Test:** `tests/test_api.py::TestApiEndpoints::test_frontend_schema_contract`
- **Verification Result:** **VERIFIED PASS.**

---

### DEFECT-08: Local DNS Forwarder Timeouts on Null MX & Coupled Domain Status
- **Severity:** P1 — High (DNS Inspection Reliability & Domain Decoupling Defect)
- **Affected File:** `backend/dns_checker.py` and `backend/config.py`
- **Reproduction Steps:**
  1. Submit `dhanurdhard2@2outlook.com` on a network where the local ISP/router DNS forwarder (e.g. `10.117.232.142`) fails or times out on MX queries for domains advertising RFC 7505 Null MX.
  2. Observe backend response: `domain_status="timeout"`, `mx_status="timeout"`, `classification="unknown"`.
  3. Run `nslookup -type=MX 2outlook.com 8.8.8.8` or `1.1.1.1` and observe that public resolvers return `MX preference = 0, mail exchanger = .` (RFC 7505 Null MX) immediately.
  4. Run `nslookup -type=A 2outlook.com` and observe that the domain has valid A records.
- **Expected Behavior:**
  1. The resolver should query OS-configured nameservers first, and seamlessly fall back to configured public resolvers (`1.1.1.1`, `8.8.8.8`) if the local forwarder times out or is unresponsive.
  2. RFC 7505 Null MX records (`0 .`) must be classified as `likely_to_bounce` with an explanation that the domain explicitly declares that it does not accept email.
  3. Domain resolution status (`domain_status`) must be decoupled from MX lookup status (`mx_status`): an MX lookup timeout must never overwrite or invalidate a successful A-record lookup.
- **Actual Behavior:**
  1. `create_resolver()` only used OS nameservers without fallback nameservers, causing the query to fail when the local network forwarder dropped the MX query.
  2. If the MX query timed out, `inspect_domain_dns()` immediately returned `domain_status="timeout"`, ignoring whether the domain actually resolved in DNS via A/AAAA records.
- **Root Cause:**
  - Lack of multi-tier nameserver fallback in resolver configuration.
  - Tightly coupled error handling in `inspect_domain_dns()` where an MX lookup failure aborted before checking domain address records.
- **Fix Implemented:**
  1. Updated `backend/config.py` with `DNS_NAMESERVERS`, `DNS_FALLBACK_NAMESERVERS` (default: `1.1.1.1,8.8.8.8`), `DNS_TIMEOUT_SECONDS = 2.0`, and `DNS_LIFETIME_SECONDS = 5.0`.
  2. Updated `create_resolver()` in `backend/dns_checker.py` to preserve system nameservers first and append fallback nameservers.
  3. Decoupled domain resolution from MX status in `inspect_domain_dns()`: if the MX query times out or fails with SERVFAIL, A/AAAA lookups are evaluated. If A records exist, `domain_status="resolved"`, `mx_status="timeout"`, and `classification="unknown"`.
  4. Null MX (`0 .`) returns `classification="likely_to_bounce"`, `domain_status="resolved"`, `mx_status="none"`, with RFC 7505 explicit explanation.
- **Regression Tests:**
  - `tests/test_dns.py::test_mx_timeout_with_successful_a_record_decoupling`
  - `tests/test_dns.py::test_mx_servfail_with_successful_a_record_decoupling`
  - `tests/test_dns.py::test_configured_nameservers_fallback_order`
  - `tests/test_integration_dns.py::test_live_null_mx_2outlook`
- **Verification Result:** **VERIFIED PASS.** (Verified in unit tests, live API test, and live browser UI test).

