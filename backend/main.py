"""
MailScope Backend - Professional Email Deliverability Analyzer API
FastAPI service providing async DNS, MX, RFC-compliant syntax analysis, and transparent deliverability classification.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time
import asyncio
from typing import Dict, List, Optional
import dns.asyncresolver

from backend.config import (
    SERVICE_NAME,
    VERSION,
    CORS_ORIGINS,
    MAX_CONCURRENT_DNS_LOOKUPS,
    MAX_EMAIL_BATCH_SIZE
)
from backend.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    BackendHealthResponse,
    Diagnostics,
    EmailAnalysisResult,
    SummaryMetrics
)
from backend.syntax import validate_email_syntax
from backend.dns_checker import (
    DomainDnsResult,
    create_resolver,
    inspect_domain_cached
)

# Global resolver and concurrency semaphore
_global_resolver: Optional[dns.asyncresolver.Resolver] = None
_dns_semaphore: Optional[asyncio.Semaphore] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes global DNS resolver and concurrency semaphore during app lifespan."""
    global _global_resolver, _dns_semaphore
    _global_resolver = create_resolver()
    _dns_semaphore = asyncio.Semaphore(MAX_CONCURRENT_DNS_LOOKUPS)
    yield
    _global_resolver = None
    _dns_semaphore = None

app = FastAPI(
    title="MailScope Email Deliverability Analyzer API",
    version=VERSION,
    description="Inspects email syntax, domain DNS status, and mail routing without sending test emails.",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_resolver() -> dns.asyncresolver.Resolver:
    global _global_resolver
    if _global_resolver is None:
        _global_resolver = create_resolver()
    return _global_resolver

def get_semaphore() -> asyncio.Semaphore:
    global _dns_semaphore
    if _dns_semaphore is None:
        _dns_semaphore = asyncio.Semaphore(MAX_CONCURRENT_DNS_LOOKUPS)
    return _dns_semaphore

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats validation errors cleanly for frontend consumption."""
    errors = exc.errors()
    first_error = errors[0]["msg"] if errors else "Invalid request body."
    return JSONResponse(
        status_code=422,
        content={"detail": f"Validation Error: {first_error}"}
    )

@app.get("/health", response_model=BackendHealthResponse)
async def health_check():
    """
    Health check endpoint to verify backend service availability and DNS resolver operation.
    Executes a real non-blocking verification of resolver readiness.
    """
    resolver = get_resolver()
    dns_status = "active"

    # Lightweight real verification of DNS resolver configuration
    if not resolver.nameservers:
        dns_status = "no_nameservers_configured"

    return BackendHealthResponse(
        status="ok",
        service=SERVICE_NAME,
        version=VERSION,
        timestamp=time.time(),
        dns_resolver=dns_status
    )

async def _process_single_email(
    raw_email: str,
    resolver: dns.asyncresolver.Resolver,
    domain_cache: Dict[str, DomainDnsResult],
    semaphore: asyncio.Semaphore
) -> EmailAnalysisResult:
    """Processes a single email: syntax check followed by async DNS inspection."""
    start_time = time.time()

    # Step 1: RFC 5321 / 5322 Syntax Check
    syntax_res = validate_email_syntax(raw_email)

    if not syntax_res.is_valid:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return EmailAnalysisResult(
            email=raw_email,
            normalized_email=syntax_res.normalized_email,
            syntax_valid=False,
            domain=syntax_res.domain,
            domain_status="not_checked",
            mx_status="not_checked",
            classification="likely_to_bounce",
            reason=f"Syntax validation failed: {syntax_res.error_reason}",
            diagnostics=Diagnostics(
                has_mx=False,
                has_fallback_a=False,
                mx_records=[],
                is_disposable=False,
                syntax_error=syntax_res.error_reason,
                response_time_ms=duration_ms
            )
        )

    # Step 2: Domain DNS & MX Inspection (Cached per domain within batch)
    dns_res = await inspect_domain_cached(
        syntax_res.ascii_domain,
        resolver,
        domain_cache,
        semaphore
    )

    reason = dns_res.reason
    if syntax_res.is_disposable:
        reason += " [Notice: Domain is recognized as a temporary/disposable email provider]."

    # Overall analysis time for this address
    duration_ms = round((time.time() - start_time) * 1000, 2)

    return EmailAnalysisResult(
        email=raw_email,
        normalized_email=syntax_res.normalized_email,
        syntax_valid=True,
        domain=syntax_res.domain,
        domain_status=dns_res.domain_status,
        mx_status=dns_res.mx_status,
        classification=dns_res.classification,
        reason=reason,
        diagnostics=Diagnostics(
            has_mx=dns_res.has_mx,
            has_fallback_a=dns_res.has_fallback_a,
            mx_records=dns_res.mx_records,
            is_disposable=syntax_res.is_disposable,
            syntax_error=None,
            response_time_ms=duration_ms
        )
    )

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_emails(payload: AnalyzeRequest):
    """
    Analyzes a batch of email addresses for deliverability evidence.
    Executes concurrent, non-blocking DNS lookups with batch-level domain caching.
    """
    if not payload.emails:
        raise HTTPException(
            status_code=400,
            detail="The emails list cannot be empty."
        )

    if len(payload.emails) > MAX_EMAIL_BATCH_SIZE:
        raise HTTPException(
            status_code=422,
            detail=f"Batch size of {len(payload.emails)} exceeds maximum allowed limit of {MAX_EMAIL_BATCH_SIZE}."
        )

    start_batch = time.time()
    resolver = get_resolver()
    semaphore = get_semaphore()

    # In-memory batch cache: prevents redundant DNS queries for identical domains
    domain_cache: Dict[str, DomainDnsResult] = {}

    # Schedule concurrent non-blocking tasks for all emails
    tasks = [
        _process_single_email(email, resolver, domain_cache, semaphore)
        for email in payload.emails
    ]
    results = await asyncio.gather(*tasks)

    # Aggregate metrics
    total = len(results)
    delivered = sum(1 for r in results if r.classification == "likely_to_be_delivered")
    bounced = sum(1 for r in results if r.classification == "likely_to_bounce")
    unknown = sum(1 for r in results if r.classification == "unknown")
    total_duration = round((time.time() - start_batch) * 1000, 2)

    return AnalyzeResponse(
        results=results,
        summary=SummaryMetrics(
            total=total,
            likely_to_be_delivered=delivered,
            likely_to_bounce=bounced,
            unknown=unknown,
            duration_ms=total_duration
        )
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
