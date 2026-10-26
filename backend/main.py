"""
MailScope Backend - Professional Email Deliverability Analyzer API
FastAPI service providing real DNS, MX, and RFC-compliant syntax analysis.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import time
import re
import dns.resolver
import dns.exception

app = FastAPI(
    title="MailScope Email Deliverability Analyzer API",
    version="1.0.0",
    description="Analyzes email syntax, domain configuration, and mail-routing DNS evidence."
)

# Enable CORS for local development and SaaS hosting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RFC 5322 compliant regex for basic syntax validation
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)

# Known disposable email providers for diagnostic insight
DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
    "trashmail.com", "sharklasers.com", "dispostable.com", "yopmail.com"
}

class AnalyzeRequest(BaseModel):
    emails: List[str] = Field(..., max_items=200, description="List of email addresses to analyze (max 200)")

class Diagnostics(BaseModel):
    has_mx: bool
    has_fallback_a: bool
    mx_records: List[str]
    is_disposable: bool
    syntax_error: Optional[str] = None
    response_time_ms: float

class EmailAnalysisResult(BaseModel):
    email: str
    normalized_email: str
    syntax_valid: bool
    domain: str
    domain_status: str  # resolved | nonexistent | timeout | no_mail_records | not_checked
    mx_status: str      # present | none | fallback_a_record | timeout | not_checked
    classification: str # likely_to_be_delivered | likely_to_bounce | unknown
    reason: str
    diagnostics: Diagnostics

class SummaryMetrics(BaseModel):
    total: int
    likely_to_be_delivered: int
    likely_to_bounce: int
    unknown: int
    duration_ms: float

class AnalyzeResponse(BaseModel):
    results: List[EmailAnalysisResult]
    summary: SummaryMetrics

@app.get("/health")
def health_check():
    """Health check endpoint to verify backend availability."""
    return {
        "status": "ok",
        "service": "mailscope-analyzer",
        "version": "1.0.0",
        "timestamp": time.time(),
        "dns_resolver": "active"
    }

def analyze_single_email(raw_email: str) -> EmailAnalysisResult:
    start_time = time.time()
    clean_email = raw_email.strip()

    # 1. Syntax check
    if not clean_email:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return EmailAnalysisResult(
            email=raw_email,
            normalized_email="",
            syntax_valid=False,
            domain="",
            domain_status="not_checked",
            mx_status="not_checked",
            classification="likely_to_bounce",
            reason="Empty email string provided.",
            diagnostics=Diagnostics(
                has_mx=False,
                has_fallback_a=False,
                mx_records=[],
                is_disposable=False,
                syntax_error="Empty address",
                response_time_ms=duration_ms
            )
        )

    # Check for basic length constraints
    if len(clean_email) > 254:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return EmailAnalysisResult(
            email=raw_email,
            normalized_email=clean_email,
            syntax_valid=False,
            domain="",
            domain_status="not_checked",
            mx_status="not_checked",
            classification="likely_to_bounce",
            reason="Email exceeds maximum RFC 5321 length of 254 characters.",
            diagnostics=Diagnostics(
                has_mx=False,
                has_fallback_a=False,
                mx_records=[],
                is_disposable=False,
                syntax_error="Address length > 254 characters",
                response_time_ms=duration_ms
            )
        )

    if not EMAIL_REGEX.match(clean_email):
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return EmailAnalysisResult(
            email=raw_email,
            normalized_email=clean_email,
            syntax_valid=False,
            domain=clean_email.split("@")[-1] if "@" in clean_email else "",
            domain_status="not_checked",
            mx_status="not_checked",
            classification="likely_to_bounce",
            reason="Address does not conform to standard RFC 5322 email syntax rules.",
            diagnostics=Diagnostics(
                has_mx=False,
                has_fallback_a=False,
                mx_records=[],
                is_disposable=False,
                syntax_error="Failed RFC 5322 regex validation",
                response_time_ms=duration_ms
            )
        )

    # Extract domain
    parts = clean_email.split("@")
    domain = parts[1].lower()
    is_disposable = domain in DISPOSABLE_DOMAINS

    # 2. DNS & MX Lookup
    resolver = dns.resolver.Resolver()
    resolver.timeout = 2.5
    resolver.lifetime = 2.5

    mx_records = []
    has_mx = False
    has_fallback_a = False
    domain_status = "resolved"
    mx_status = "none"
    classification = "unknown"
    reason = ""

    # Check MX records
    try:
        mx_answers = resolver.resolve(domain, 'MX')
        # Sort by preference
        sorted_answers = sorted(mx_answers, key=lambda rdata: rdata.preference)
        for rdata in sorted_answers:
            exchange = str(rdata.exchange).rstrip('.')
            mx_records.append(f"{exchange} (priority: {rdata.preference})")
        
        if mx_records:
            has_mx = True
            mx_status = "present"
            domain_status = "resolved"
            classification = "likely_to_be_delivered"
            reason = f"Domain resolves with {len(mx_records)} active MX record(s). Delivery route is technically configured."
    except dns.resolver.NXDOMAIN:
        domain_status = "nonexistent"
        mx_status = "none"
        classification = "likely_to_bounce"
        reason = f"Domain '{domain}' does not exist in DNS (NXDOMAIN)."
    except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        # MX record not present, check for RFC 5321 fallback A / AAAA records
        has_mx = False
        try:
            a_answers = resolver.resolve(domain, 'A')
            if a_answers:
                has_fallback_a = True
                domain_status = "resolved"
                mx_status = "fallback_a_record"
                classification = "unknown"
                reason = "No MX records found, but domain has A records. RFC 5321 fallback routing may apply; delivery is uncertain."
        except Exception:
            try:
                aaaa_answers = resolver.resolve(domain, 'AAAA')
                if aaaa_answers:
                    has_fallback_a = True
                    domain_status = "resolved"
                    mx_status = "fallback_a_record"
                    classification = "unknown"
                    reason = "No MX records found, but domain has AAAA records. RFC 5321 fallback routing may apply; delivery is uncertain."
                else:
                    domain_status = "no_mail_records"
                    mx_status = "none"
                    classification = "likely_to_bounce"
                    reason = f"Domain '{domain}' exists but has no MX or fallback A/AAAA routing records."
            except Exception:
                domain_status = "no_mail_records"
                mx_status = "none"
                classification = "likely_to_bounce"
                reason = f"Domain '{domain}' exists but has no MX or fallback A/AAAA routing records."
    except dns.exception.Timeout:
        domain_status = "timeout"
        mx_status = "timeout"
        classification = "unknown"
        reason = f"DNS lookup for domain '{domain}' timed out. Cannot confirm status without live nameserver response."
    except Exception as e:
        domain_status = "unknown"
        mx_status = "unknown"
        classification = "unknown"
        reason = f"DNS query failed with error: {str(e)}"

    if is_disposable:
        reason += " [Notice: Domain is recognized as a temporary/disposable email provider]."

    duration_ms = round((time.time() - start_time) * 1000, 2)

    return EmailAnalysisResult(
        email=clean_email,
        normalized_email=clean_email.lower(),
        syntax_valid=True,
        domain=domain,
        domain_status=domain_status,
        mx_status=mx_status,
        classification=classification,
        reason=reason,
        diagnostics=Diagnostics(
            has_mx=has_mx,
            has_fallback_a=has_fallback_a,
            mx_records=mx_records,
            is_disposable=is_disposable,
            syntax_error=None,
            response_time_ms=duration_ms
        )
    )

@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze_emails(payload: AnalyzeRequest):
    """Analyzes a batch of email addresses for deliverability evidence."""
    if not payload.emails:
        raise HTTPException(status_code=400, detail="The emails list cannot be empty.")
    
    start_batch = time.time()
    results = [analyze_single_email(email) for email in payload.emails]
    
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
    uvicorn.run(app, host="127.0.0.1", port=8000)
