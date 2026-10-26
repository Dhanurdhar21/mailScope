"""
Pydantic schemas and models for MailScope API.
Strictly preserves contract expected by the React frontend TypeScript definitions.
"""

from pydantic import BaseModel, Field
from typing import List, Optional

class AnalyzeRequest(BaseModel):
    emails: List[str] = Field(
        ...,
        min_length=1,
        max_length=200,
        description="List of email addresses to analyze (1 to 200 items)"
    )

class Diagnostics(BaseModel):
    has_mx: bool = Field(..., description="True if domain has active MX records")
    has_fallback_a: bool = Field(..., description="True if domain falls back to A/AAAA routing")
    mx_records: List[str] = Field(default_factory=list, description="Sorted list of MX exchange hostnames with preference")
    is_disposable: bool = Field(..., description="True if domain is a known temporary/disposable provider")
    syntax_error: Optional[str] = Field(None, description="Specific syntax failure description if invalid")
    response_time_ms: float = Field(..., description="Lookup latency in milliseconds")

class EmailAnalysisResult(BaseModel):
    email: str = Field(..., description="Raw email address submitted")
    normalized_email: str = Field(..., description="Cleaned, lowercase normalized address")
    syntax_valid: bool = Field(..., description="True if address conforms to RFC syntax rules")
    domain: str = Field(..., description="Extracted domain part (IDNA ASCII encoded if internationalized)")
    domain_status: str = Field(..., description="resolved | nonexistent | timeout | no_mail_records | not_checked | unknown")
    mx_status: str = Field(..., description="present | none | fallback_a_record | timeout | not_checked | unknown")
    classification: str = Field(..., description="likely_to_be_delivered | likely_to_bounce | unknown")
    reason: str = Field(..., description="Human-readable explanation of technical findings and limitations")
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

class BackendHealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: float
    dns_resolver: str
