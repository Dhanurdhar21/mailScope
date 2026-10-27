# MailScope Pre-Release Test Case Matrix

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-27  
**Scope:** Pre-Release Formal Quality Gate — Full Stack (Frontend, Backend, DNS Engine, Security, Performance, Accessibility)  
**Classification:** Pre-Release Quality Assessment  

---

## 1. Summary of Test Case Execution

| Category | Total Cases | PASS | FAIL | BLOCKED | SKIPPED | NOT RUN | Pass Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **API Endpoints (`API-xxx`)** | 12 | 12 | 0 | 0 | 0 | 0 | 100% |
| **DNS Inspection & Routing (`DNS-xxx`)** | 12 | 12 | 0 | 0 | 0 | 0 | 100% |
| **Input Parsing & Syntax (`INPUT-xxx`)** | 19 | 19 | 0 | 0 | 0 | 0 | 100% |
| **UI Components & Workflows (`UI-xxx`)** | 16 | 16 | 0 | 0 | 0 | 0 | 100% |
| **Security & Hardening (`SEC-xxx`)** | 9 | 9 | 0 | 0 | 0 | 0 | 100% |
| **Performance & Resilience (`PERF-xxx`)** | 6 | 6 | 0 | 0 | 0 | 0 | 100% |
| **Accessibility & Responsive (`A11Y-xxx`)** | 7 | 7 | 0 | 0 | 0 | 0 | 100% |
| **TOTAL** | **81** | **81** | **0** | **0** | **0** | **0** | **100%** |

---

## 2. Comprehensive Traceability Matrix

### A. API Endpoints (`API-xxx`)

| Test ID | Requirement / Feature | Test Type | Expected Behavior | Automated Test Location | Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **API-001** | `GET /health` service health | Positive | Returns HTTP 200 with service, version, timestamp, and active DNS status | `tests/test_api.py::test_health_check_endpoint` | **PASS** | — |
| **API-002** | `POST /api/analyze` empty batch | Negative | Rejects empty emails array with HTTP 422 or 400 | `tests/test_api.py::test_empty_emails_list_rejected` | **PASS** | — |
| **API-003** | Max batch size boundary (200) | Boundary | Accepts exactly 200 emails and processes batch completely | `tests/test_api.py::test_max_batch_size_accepted` | **PASS** | — |
| **API-004** | Exceeding batch boundary (201) | Boundary / Neg | Rejects 201 emails with HTTP 422 Unprocessable Content | `tests/test_api.py::test_batch_exceeding_limit_rejected` | **PASS** | — |
| **API-005** | Batch with duplicate addresses | Edge / Pos | Resolves duplicates without failure, returns matching result entries | `tests/test_api.py::test_duplicate_addresses_handled` | **PASS** | — |
| **API-006** | Partial DNS failure in batch | Failure | One address resolution failure does not abort remaining batch | `tests/test_api.py::test_single_dns_failure_does_not_crash_batch` | **PASS** | — |
| **API-007** | Malformed JSON request body | Negative | Returns HTTP 422 validation error with safe message | `tests/test_api.py::test_malformed_json_body` | **PASS** | — |
| **API-008** | Frontend TypeScript schema compatibility | Contract | All required frontend fields (`normalized_email`, `domain_status`, etc.) present | `tests/test_api.py::test_frontend_schema_contract` | **PASS** | — |
| **API-009** | CORS preflight handling (`OPTIONS`) | Security / Pos | Responds HTTP 200 with appropriate `access-control-allow-origin` | `tests/test_api.py::test_cors_preflight` | **PASS** | — |
| **API-010** | Request size limit (512 KB) | Security / Boundary | Request bodies > 512KB return HTTP 413 Payload Too Large | `tests/test_api.py::test_regression_oversized_payload_returns_413` | **PASS** | P1 (Fixed) |
| **API-011** | Non-string / invalid JSON data types | Negative | String instead of array, null elements, or integers return HTTP 422 | `tests/test_api.py::test_invalid_types_and_missing_keys_rejected` | **PASS** | — |
| **API-012** | Batch summary count invariant | Invariant / Pos | `total == likely_to_be_delivered + likely_to_bounce + unknown` holds | `tests/test_api.py::test_summary_invariant_consistency` | **PASS** | — |

---

### B. DNS Inspection & Mail Routing (`DNS-xxx`)

| Test ID | Requirement / Feature | Test Type | Expected Behavior | Automated Test Location | Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **DNS-001** | Standard MX records | Positive | MX records resolved and sorted by preference priority (lowest priority first) | `tests/test_dns.py::test_standard_mx_records_sorted` | **PASS** | — |
| **DNS-002** | RFC 7505 Null MX record | Edge / Neg | Preference 0 target `.` classified as `likely_to_bounce` | `tests/test_dns.py::test_rfc_7505_null_mx` | **PASS** | — |
| **DNS-003** | RFC 5321 Fallback A record | Edge / Fallback | Domain without MX but with A record classified as `unknown` | `tests/test_dns.py::test_rfc_5321_fallback_a_record` | **PASS** | — |
| **DNS-004** | RFC 5321 Fallback AAAA record | Edge / Fallback | Domain without MX but with AAAA record classified as `unknown` | `tests/test_dns.py::test_rfc_5321_fallback_aaaa_record` | **PASS** | — |
| **DNS-005** | Domain with no mail or address records | Negative | Existing domain with NoAnswer on MX, A, and AAAA classified as `likely_to_bounce` | `tests/test_dns.py::test_domain_with_no_routing_evidence` | **PASS** | — |
| **DNS-006** | NXDOMAIN non-existent domain | Negative | Authoritative NXDOMAIN classified definitively as `likely_to_bounce` | `tests/test_dns.py::test_confirmed_nxdomain` | **PASS** | — |
| **DNS-007** | DNS query timeout | Failure / Inconclusive | Timeout classified as `unknown`, never as hard bounce | `tests/test_dns.py::test_dns_timeout_is_not_bounce` | **PASS** | — |
| **DNS-008** | SERVFAIL / Missing nameservers | Failure / Inconclusive | SERVFAIL classified as `unknown` with inconclusive diagnosis | `tests/test_dns.py::test_servfail_temporary_failure` | **PASS** | — |
| **DNS-009** | Fallback A/AAAA temporary failure | Regression | Temporary failure during fallback lookup classified as `unknown`, NOT bounce | `tests/test_dns.py::test_regression_fallback_temporary_failure_is_unknown_not_bounce` | **PASS** | P1 (Fixed) |
| **DNS-010** | Batch domain in-flight coalescing | Concurrency / Perf | Concurrent lookups for identical domain executed only once | `tests/test_dns.py::test_batch_domain_resolver_coalesces_queries` | **PASS** | P1 (Fixed) |
| **DNS-011** | Live DNS resolution (Google) | Integration | Resolves live Google MX records with deliverable classification | `tests/test_integration_dns.py::test_live_gmail_domain` | **PASS** | — |
| **DNS-012** | Live NXDOMAIN resolution | Integration | Resolves random UUID `.xyz` domain to confirmed bounce | `tests/test_integration_dns.py::test_live_nonexistent_domain` | **PASS** | — |

---

### C. Input Parsing & Syntax Validation (`INPUT-xxx`)

| Test ID | Requirement / Feature | Test Type | Expected Behavior | Automated Test Location | Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **INPUT-001** | Standard RFC 5322 valid addresses | Positive | Standard email addresses validated and normalized | `tests/test_syntax.py::test_valid_standard_emails` | **PASS** | — |
| **INPUT-002** | Plus-addressing subaddressing | Positive | Validates subaddressing (`user+tag@gmail.com`) correctly | `tests/test_syntax.py::test_plus_addressing` | **PASS** | — |
| **INPUT-003** | RFC 5322 permitted special chars | Positive | Validates special chars `!#$%&'*+-/=?^_{|}~` | `tests/test_syntax.py::test_special_valid_characters` | **PASS** | — |
| **INPUT-004** | Empty and whitespace inputs | Negative | Empty strings and whitespace-only inputs rejected safely | `tests/test_syntax.py::test_empty_and_whitespace` | **PASS** | — |
| **INPUT-005** | Missing @ or multiple @ symbols | Negative | Rejects missing @, double @@, missing local-part, missing domain | `tests/test_syntax.py::test_missing_delimiter_or_parts` | **PASS** | — |
| **INPUT-006** | Dot-atom boundary violations | Negative | Leading dot, trailing dot, consecutive dots (`..`) rejected | `tests/test_syntax.py::test_dot_atom_violations` | **PASS** | — |
| **INPUT-007** | Total length boundary (254 chars) | Boundary | Total length > 254 characters rejected per RFC 5321 | `tests/test_syntax.py::test_length_limits` | **PASS** | — |
| **INPUT-008** | Local-part length boundary (64 chars) | Boundary | Local-part > 64 characters rejected | `tests/test_syntax.py::test_length_limits` | **PASS** | — |
| **INPUT-009** | Domain label length boundary (63 chars) | Boundary | Domain label > 63 characters rejected | `tests/test_syntax.py::test_length_limits` | **PASS** | — |
| **INPUT-010** | Internationalized domain names (IDN) | Positive | Unicode domains converted to Punycode ASCII correctly | `tests/test_syntax.py::test_internationalized_domains` | **PASS** | — |
| **INPUT-011** | Disposable domain detection | Feature | Known disposable domains flagged in diagnostics | `tests/test_syntax.py::test_disposable_domain_detection` | **PASS** | — |
| **INPUT-012** | Null byte injection (`\x00`) | Security / Neg | Null bytes in local-part or domain rejected immediately | `tests/test_syntax.py::test_null_bytes_and_control_characters` | **PASS** | — |
| **INPUT-013** | Control character injection (`\r\n\t`) | Security / Neg | CRLF and tab characters rejected to prevent header injection | `tests/test_syntax.py::test_null_bytes_and_control_characters` | **PASS** | — |
| **INPUT-014** | Non-string data structures | Negative | Numbers, lists, dicts, None rejected gracefully without crashing | `tests/test_syntax.py::test_non_string_types` | **PASS** | — |
| **INPUT-015** | Domain label hyphens boundary | Boundary / Neg | Domain labels starting or ending with hyphens rejected | `tests/test_syntax.py::test_domain_label_hyphen_boundaries` | **PASS** | — |
| **INPUT-016** | Frontend delimiter parser | Positive | Parses newlines, commas, semicolons, tabs, and spaces | `src/__tests__/emailParser.test.ts::handles multiple separators` | **PASS** | — |
| **INPUT-017** | Frontend case-insensitive dedup | Positive | Deduplicates addresses while preserving casing for display | `src/__tests__/emailParser.test.ts::deduplicates case-insensitively` | **PASS** | — |
| **INPUT-018** | Frontend empty token filtering | Edge | Strips empty lines and blank tokens | `src/__tests__/emailParser.test.ts::filters out empty tokens` | **PASS** | — |
| **INPUT-019** | Frontend 200 batch capping | Boundary | Caps batch at 200 and raises `exceedsLimit=true` flag | `src/__tests__/emailParser.test.ts::caps batches at exactly 200` | **PASS** | — |

---

### D. UI Components & Workflows (`UI-xxx`)

| Test ID | Requirement / Feature | Test Type | Expected Behavior | Automated Test Location | Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **UI-001** | Landing page CTA navigation | Workflow | Clicking "Analyze Email Deliverability" navigates to `/dashboard` | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **UI-002** | Dashboard sample data loading | Feature | "Load Sample Batch" populates textarea with 8 varied test emails | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **UI-003** | End-to-end analysis submission | Workflow | "Run Deliverability Analysis" dispatches API request and updates UI | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **UI-004** | Honest timeline progression | Workflow | Timeline updates without deceptive artificial timers | `src/hooks/useAnalysis.ts` / Browser | **PASS** | P2 (Fixed) |
| **UI-005** | StatusBadge rendering | Component | Renders deliverable, bounce, and unknown badges with semantic colors | `src/__tests__/components.test.tsx::StatusBadge` | **PASS** | — |
| **UI-006** | SummaryCard metrics display | Component | Displays total, deliverable, bounce, unknown counts and % ratios | `src/__tests__/components.test.tsx::SummaryCard` | **PASS** | — |
| **UI-007** | Search filter in results table | Feature | Filters rows by search term in email, domain, or reason | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **UI-008** | Classification card filter | Feature | Clicking summary cards filters results table by status | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **UI-009** | Result details modal open | Feature | Clicking "Inspect" opens modal displaying DNS records & reason | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **UI-010** | Result details modal close (Escape) | Accessibility | Pressing Escape key closes modal and returns focus cleanly | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **UI-011** | CSV export triggering | Feature | Clicking "Export RFC-4180 CSV" initiates valid file download | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **UI-012** | CSV RFC-4180 formatting | Component | Double quotes escaped, commas preserved, row counts exact | `src/__tests__/csvExport.test.ts::generateCsvContent` | **PASS** | — |
| **UI-013** | Backend health banner | Feature | Displays operational status banner reflecting `/health` check | `src/__tests__/api.test.ts` / Browser | **PASS** | — |
| **UI-014** | API client error normalization | Resilience | HTTP 422, 413, and 500 errors formatted into clear user alerts | `src/__tests__/api.test.ts::analyzeEmailsApi` | **PASS** | — |
| **UI-015** | Empty results reset | Workflow | "Reset" button clears results, restores empty state | `src/hooks/useAnalysis.ts` | **PASS** | — |
| **UI-016** | Clear input button | Feature | "Clear" button resets textarea input and validation counter | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |

---

### E. Security & Hardening (`SEC-xxx`)

| Test ID | Requirement / Feature | Test Type | Expected Behavior | Automated Test Location | Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **SEC-001** | CORS wildcard credentials check | Security | `allow_credentials=False` when `allow_origins=["*"]` | `backend/main.py::app` / `test_api.py` | **PASS** | P1 (Fixed) |
| **SEC-002** | Request body size limit (CWE-400) | Security / DoS | Content-Length > 512KB rejected before memory buffering with HTTP 413 | `tests/test_api.py::test_regression_oversized_payload_returns_413` | **PASS** | P1 (Fixed) |
| **SEC-003** | CSV formula injection standard (CWE-1236) | Security / Injection | Cells starting with `=`, `+`, `-`, `@` prepended with `'` | `src/__tests__/csvExport.test.ts::neutralizes standard formula` | **PASS** | P1 (Fixed) |
| **SEC-004** | CSV formula injection whitespace bypass | Security / Injection | Cells with leading spaces/tabs before formula prepended with `'` | `src/__tests__/csvExport.test.ts::neutralizes formula injection with leading whitespace` | **PASS** | P1 (Fixed) |
| **SEC-005** | CSV formula operators (`\|`, `%`) | Security / Injection | Pipe and percent formula characters neutralized | `src/__tests__/csvExport.test.ts::neutralizes pipe and percent` | **PASS** | P2 (Fixed) |
| **SEC-006** | CSV filename sanitization | Security | Filename prefix stripped of path traversal / illegal characters | `src/services/csvExport.ts` | **PASS** | P3 (Fixed) |
| **SEC-007** | CRLF and Null byte header injection | Security / Injection | Rejects `\r\n` and `\x00` in email addresses | `tests/test_syntax.py::test_null_bytes_and_control_characters` | **PASS** | — |
| **SEC-008** | Production debug mode leakage | Security / Info | FastAPI debug mode disabled in production configuration | `backend/config.py` | **PASS** | — |
| **SEC-009** | Secret exposure review | Security / Auditing | Repository scanned: zero API keys, secrets, or passwords committed | Audit inspection / Git history | **PASS** | — |

---

### F. Performance & Resilience (`PERF-xxx`)

| Test ID | Requirement / Feature | Test Type | Expected Behavior | Automated Test Location | Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **PERF-001** | Batch 1 address latency | Benchmark | Baseline latency measured < 50ms with mock DNS | `tests/perf_test.py` (Actual: 20.22ms) | **PASS** | — |
| **PERF-002** | Batch 10 addresses coalesced | Benchmark | DNS queried exactly once for shared domain; latency < 50ms | `tests/perf_test.py` (Actual: 14.96ms) | **PASS** | — |
| **PERF-003** | Batch 50 addresses coalesced | Benchmark | DNS queried exactly once for shared domain; latency < 50ms | `tests/perf_test.py` (Actual: 15.70ms) | **PASS** | — |
| **PERF-004** | Batch 100 addresses coalesced | Benchmark | DNS queried exactly once for shared domain; latency < 50ms | `tests/perf_test.py` (Actual: 25.38ms) | **PASS** | — |
| **PERF-005** | Batch 200 addresses coalesced | Benchmark | Max batch size processed in < 100ms; latency < 50ms | `tests/perf_test.py` (Actual: 24.38ms) | **PASS** | — |
| **PERF-006** | Batch 50 distinct domains concurrent | Concurrency | Concurrent DNS resolution throttled by semaphore; latency < 100ms | `tests/perf_test.py` (Actual: 17.86ms) | **PASS** | — |

---

### G. Accessibility & Responsive Design (`A11Y-xxx`)

| Test ID | Requirement / Feature | Test Type | Expected Behavior | Automated Test Location | Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **A11Y-001** | Mobile viewport (375x812) | Responsive | No horizontal overflow, clear readable typography, touch targets >= 44px | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **A11Y-002** | Tablet viewport (768x1024) | Responsive | Grid gracefully reorganizes into 2-column layout | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **A11Y-003** | Desktop viewport (1440x900) | Responsive | Full 4-column summary grid, expanded results table with horizontal scrolling | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **A11Y-004** | Modal keyboard trap & Escape key | Accessibility | Pressing Escape dismisses modal; backdrop click dismisses | `browser_subagent::mailscope_audit_e2e` | **PASS** | — |
| **A11Y-005** | Color contrast compliance | Visual / A11Y | Text colors meet WCAG AA ratio (>= 4.5:1) against light backgrounds | Visual Audit / CSS Inspection | **PASS** | — |
| **A11Y-006** | Non-color status indicators | Accessibility | Badges use distinct icons (Check, X, Help) in addition to colors | `src/__tests__/components.test.tsx` | **PASS** | — |
| **A11Y-007** | Focus visibility | Accessibility | Buttons and inputs show distinct focus rings upon keyboard tab | Browser audit | **PASS** | — |
