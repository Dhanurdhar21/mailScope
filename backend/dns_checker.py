"""
Async DNS and Mail-Routing Inspector for MailScope.
Evaluates domain registration, MX records, RFC 7505 Null MX, and RFC 5321 fallback A/AAAA records.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict
import time
import asyncio
import dns.asyncresolver
import dns.resolver
import dns.exception
from backend.config import (
    DNS_TIMEOUT_SECONDS,
    DNS_LIFETIME_SECONDS,
    MAX_CONCURRENT_DNS_LOOKUPS
)

@dataclass
class DomainDnsResult:
    domain: str
    domain_status: str       # resolved | nonexistent | timeout | no_mail_records | unknown
    mx_status: str           # present | none | fallback_a_record | timeout | unknown
    classification: str      # likely_to_be_delivered | likely_to_bounce | unknown
    reason: str
    has_mx: bool = False
    has_fallback_a: bool = False
    mx_records: List[str] = field(default_factory=list)
    response_time_ms: float = 0.0

def create_resolver() -> dns.asyncresolver.Resolver:
    """Creates a configured asynchronous DNS resolver."""
    resolver = dns.asyncresolver.Resolver()
    resolver.timeout = DNS_TIMEOUT_SECONDS
    resolver.lifetime = DNS_LIFETIME_SECONDS
    return resolver

async def inspect_domain_dns(
    domain: str,
    resolver: Optional[dns.asyncresolver.Resolver] = None
) -> DomainDnsResult:
    """
    Asynchronously inspects DNS records for a given domain:
    1. Checks for MX records (identifying RFC 7505 Null MX).
    2. If no MX records exist, checks RFC 5321 fallback A / AAAA records.
    3. Accurately handles NXDOMAIN, timeouts, and temporary failures.
    """
    if resolver is None:
        resolver = create_resolver()

    start_time = time.time()
    clean_domain = domain.strip().lower().rstrip(".")

    # Handle empty domain edge case
    if not clean_domain:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="nonexistent",
            mx_status="none",
            classification="likely_to_bounce",
            reason="Empty domain cannot be resolved.",
            response_time_ms=duration_ms
        )

    # 1. Query MX records
    try:
        mx_answers = await resolver.resolve(clean_domain, "MX")
        sorted_answers = sorted(mx_answers, key=lambda rdata: rdata.preference)

        # Check for RFC 7505 Null MX: "0 ." or target "."
        # Indicates the domain explicitly does not accept email
        for rdata in sorted_answers:
            target_str = str(rdata.exchange).rstrip(".")
            if target_str == "" or str(rdata.exchange) == ".":
                duration_ms = round((time.time() - start_time) * 1000, 2)
                return DomainDnsResult(
                    domain=clean_domain,
                    domain_status="resolved",
                    mx_status="none",
                    classification="likely_to_bounce",
                    reason=f"Domain '{clean_domain}' publishes an explicit Null MX record (RFC 7505) stating it does not accept email.",
                    has_mx=False,
                    has_fallback_a=False,
                    mx_records=[f". (priority: {rdata.preference}) [RFC 7505 Null MX]"],
                    response_time_ms=duration_ms
                )

        # Active MX records found
        formatted_mx: List[str] = []
        for rdata in sorted_answers:
            exchange_host = str(rdata.exchange).rstrip(".")
            formatted_mx.append(f"{exchange_host} (priority: {rdata.preference})")

        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="resolved",
            mx_status="present",
            classification="likely_to_be_delivered",
            reason=f"Domain '{clean_domain}' resolves with {len(formatted_mx)} active MX record(s). Mail routing is technically configured.",
            has_mx=True,
            has_fallback_a=False,
            mx_records=formatted_mx,
            response_time_ms=duration_ms
        )

    except dns.resolver.NXDOMAIN:
        # Domain definitively does not exist
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="nonexistent",
            mx_status="none",
            classification="likely_to_bounce",
            reason=f"Domain '{clean_domain}' does not exist in DNS (NXDOMAIN).",
            has_mx=False,
            has_fallback_a=False,
            mx_records=[],
            response_time_ms=duration_ms
        )

    except dns.exception.Timeout:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="timeout",
            mx_status="timeout",
            classification="unknown",
            reason=f"DNS query for '{clean_domain}' timed out. Deliverability cannot be reliably confirmed without a live nameserver response.",
            has_mx=False,
            has_fallback_a=False,
            mx_records=[],
            response_time_ms=duration_ms
        )

    except (dns.resolver.NoNameservers, dns.resolver.LifetimeTimeout):
        # Temporary / server failure - must NOT be treated as hard bounce
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="unknown",
            mx_status="unknown",
            classification="unknown",
            reason=f"Authoritative nameservers for '{clean_domain}' are unreachable or returned SERVFAIL. Status is unknown.",
            has_mx=False,
            has_fallback_a=False,
            mx_records=[],
            response_time_ms=duration_ms
        )

    except dns.resolver.NoAnswer:
        # Domain exists, but has NO MX records.
        # RFC 5321 Section 5.1 specifies implicit fallback to address records (A / AAAA)
        pass

    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="unknown",
            mx_status="unknown",
            classification="unknown",
            reason=f"Unexpected DNS query failure for '{clean_domain}': {str(e)}",
            has_mx=False,
            has_fallback_a=False,
            mx_records=[],
            response_time_ms=duration_ms
        )

    # 2. Check RFC 5321 Fallback (A / AAAA records)
    has_fallback_a = False
    has_fallback_aaaa = False

    try:
        a_answers = await resolver.resolve(clean_domain, "A")
        if a_answers:
            has_fallback_a = True
    except dns.resolver.NXDOMAIN:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="nonexistent",
            mx_status="none",
            classification="likely_to_bounce",
            reason=f"Domain '{clean_domain}' does not exist in DNS (NXDOMAIN on A query).",
            response_time_ms=duration_ms
        )
    except dns.exception.Timeout:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="timeout",
            mx_status="unknown",
            classification="unknown",
            reason=f"No MX records found for '{clean_domain}', and fallback address lookup timed out.",
            response_time_ms=duration_ms
        )
    except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        pass
    except Exception:
        pass

    if not has_fallback_a:
        try:
            aaaa_answers = await resolver.resolve(clean_domain, "AAAA")
            if aaaa_answers:
                has_fallback_aaaa = True
        except dns.resolver.NXDOMAIN:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return DomainDnsResult(
                domain=clean_domain,
                domain_status="nonexistent",
                mx_status="none",
                classification="likely_to_bounce",
                reason=f"Domain '{clean_domain}' does not exist in DNS (NXDOMAIN on AAAA query).",
                response_time_ms=duration_ms
            )
        except dns.exception.Timeout:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return DomainDnsResult(
                domain=clean_domain,
                domain_status="timeout",
                mx_status="unknown",
                classification="unknown",
                reason=f"No MX records found for '{clean_domain}', and fallback address lookup timed out.",
                response_time_ms=duration_ms
            )
        except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
            pass
        except Exception:
            pass

    duration_ms = round((time.time() - start_time) * 1000, 2)

    if has_fallback_a or has_fallback_aaaa:
        record_type = "A" if has_fallback_a else "AAAA"
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="resolved",
            mx_status="fallback_a_record",
            classification="unknown",
            reason=f"No dedicated MX records found for '{clean_domain}', but domain resolves to {record_type} records. RFC 5321 implicit fallback routing may apply; delivery is uncertain.",
            has_mx=False,
            has_fallback_a=True,
            mx_records=[],
            response_time_ms=duration_ms
        )

    # Confirmed absence of both MX and A/AAAA records
    return DomainDnsResult(
        domain=clean_domain,
        domain_status="no_mail_records",
        mx_status="none",
        classification="likely_to_bounce",
        reason=f"Domain '{clean_domain}' exists in DNS but publishes no MX or fallback A/AAAA routing records.",
        has_mx=False,
        has_fallback_a=False,
        mx_records=[],
        response_time_ms=duration_ms
    )

async def inspect_domain_cached(
    domain: str,
    resolver: dns.asyncresolver.Resolver,
    cache: Dict[str, DomainDnsResult],
    semaphore: asyncio.Semaphore
) -> DomainDnsResult:
    """
    Inspects domain DNS using a batch cache and concurrency limiter.
    """
    clean_domain = domain.strip().lower().rstrip(".")
    if clean_domain in cache:
        return cache[clean_domain]

    async with semaphore:
        # Re-check cache after acquiring semaphore
        if clean_domain in cache:
            return cache[clean_domain]
        result = await inspect_domain_dns(clean_domain, resolver)
        cache[clean_domain] = result
        return result
