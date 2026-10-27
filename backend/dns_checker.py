"""
Async DNS and Mail-Routing Inspector for MailScope.
Evaluates domain registration, MX records, RFC 7505 Null MX, and RFC 5321 fallback A/AAAA records.
Includes batch-level deduplication and in-flight query coalescing.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict
import time
import asyncio
import dns.asyncresolver
import dns.resolver
import dns.exception
from backend.config import (
    DNS_NAMESERVERS,
    DNS_FALLBACK_NAMESERVERS,
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

def get_configured_nameservers() -> List[str]:
    """
    Returns the ordered list of nameservers to query:
    1. If DNS_NAMESERVERS is explicitly configured, use it directly.
    2. Otherwise, preserve system nameservers first, then append fallback nameservers
       (e.g., Cloudflare 1.1.1.1 and Google 8.8.8.8). This ensures local network resolution
       works while preventing local forwarder packet-drops from blocking deliverability analysis.
    """
    if DNS_NAMESERVERS:
        return list(DNS_NAMESERVERS)

    nameservers: List[str] = []
    seen = set()

    # Query OS-configured system nameservers
    try:
        sys_res = dns.resolver.Resolver()
        for ns in sys_res.nameservers:
            if ns and ns not in seen:
                seen.add(ns)
                nameservers.append(ns)
    except Exception:
        pass

    # Append fallback nameservers
    for ns in DNS_FALLBACK_NAMESERVERS:
        if ns and ns not in seen:
            seen.add(ns)
            nameservers.append(ns)

    return nameservers if nameservers else ["1.1.1.1", "8.8.8.8"]

def create_resolver() -> dns.asyncresolver.Resolver:
    """Creates a configured asynchronous DNS resolver."""
    resolver = dns.asyncresolver.Resolver()
    resolver.nameservers = get_configured_nameservers()
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
    3. Accurately distinguishes definitive negative results from temporary failures/timeouts.
    4. Decouples domain resolution status from MX lookup status (e.g. A record resolves even if MX times out).
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
    mx_answers = None
    sorted_answers = []
    null_mx_record = None
    mx_status_code = None  # "present" | "null_mx" | "no_answer" | "nxdomain" | "timeout" | "temporary_error"

    try:
        mx_answers = await resolver.resolve(clean_domain, "MX")
        sorted_answers = sorted(mx_answers, key=lambda rdata: rdata.preference)

        # Check for RFC 7505 Null MX: preference 0, exchange "."
        for rdata in sorted_answers:
            target_str = str(rdata.exchange).rstrip(".")
            if (target_str == "" or str(rdata.exchange) == ".") and rdata.preference == 0:
                null_mx_record = f". (priority: 0) [RFC 7505 Null MX]"
                break

        if null_mx_record is not None:
            mx_status_code = "null_mx"
        else:
            mx_status_code = "present"

    except dns.resolver.NXDOMAIN:
        mx_status_code = "nxdomain"
    except dns.resolver.NoAnswer:
        mx_status_code = "no_answer"
    except (dns.exception.Timeout, dns.resolver.LifetimeTimeout):
        mx_status_code = "timeout"
    except (dns.resolver.NoNameservers, dns.resolver.LifetimeTimeout):
        mx_status_code = "temporary_error"
    except Exception:
        mx_status_code = "temporary_error"

    # Definite MX outcome 1: Confirmed RFC 7505 Null MX (domain explicitly refuses email)
    if mx_status_code == "null_mx":
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="resolved",
            mx_status="none",
            classification="likely_to_bounce",
            reason=f"Domain '{clean_domain}' publishes an explicit Null MX record (RFC 7505) stating it does not accept email.",
            has_mx=False,
            has_fallback_a=False,
            mx_records=[null_mx_record],
            response_time_ms=duration_ms
        )

    # Definite MX outcome 2: Active MX records found
    if mx_status_code == "present":
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

    # Definite MX outcome 3: Confirmed NXDOMAIN on domain
    if mx_status_code == "nxdomain":
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

    # 2. Inconclusive or NoAnswer MX: Check address records (A / AAAA)
    # This decouples domain resolution from MX status (a domain with A records is resolved even if MX query times out)
    has_fallback_a = False
    has_fallback_aaaa = False
    a_nxdomain = False
    a_had_timeout = False
    a_had_temporary_error = False

    # Check A records
    try:
        a_answers = await resolver.resolve(clean_domain, "A")
        if a_answers:
            has_fallback_a = True
    except dns.resolver.NXDOMAIN:
        a_nxdomain = True
    except dns.resolver.NoAnswer:
        pass
    except (dns.exception.Timeout, dns.resolver.LifetimeTimeout):
        a_had_timeout = True
    except (dns.resolver.NoNameservers, dns.resolver.LifetimeTimeout):
        a_had_temporary_error = True
    except Exception:
        a_had_temporary_error = True

    # Check AAAA records if A records not found and domain is not NXDOMAIN
    if not has_fallback_a and not a_nxdomain:
        try:
            aaaa_answers = await resolver.resolve(clean_domain, "AAAA")
            if aaaa_answers:
                has_fallback_aaaa = True
        except dns.resolver.NXDOMAIN:
            a_nxdomain = True
        except dns.resolver.NoAnswer:
            pass
        except (dns.exception.Timeout, dns.resolver.LifetimeTimeout):
            a_had_timeout = True
        except (dns.resolver.NoNameservers, dns.resolver.LifetimeTimeout):
            a_had_temporary_error = True
        except Exception:
            a_had_temporary_error = True

    duration_ms = round((time.time() - start_time) * 1000, 2)
    has_address = (has_fallback_a or has_fallback_aaaa)

    # Outcome A: A/AAAA returned confirmed NXDOMAIN
    if a_nxdomain:
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="nonexistent",
            mx_status="none",
            classification="likely_to_bounce",
            reason=f"Domain '{clean_domain}' does not exist in DNS (NXDOMAIN on address query).",
            has_mx=False,
            has_fallback_a=False,
            mx_records=[],
            response_time_ms=duration_ms
        )

    # Outcome B: Domain HAS address records (A or AAAA)
    # The domain is DEFINITELY resolved in DNS
    if has_address:
        record_type = "A" if has_fallback_a else "AAAA"

        # Case B1: MX was NoAnswer -> RFC 5321 implicit fallback routing
        if mx_status_code == "no_answer":
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

        # Case B2: MX query timed out, but domain resolution succeeded
        if mx_status_code == "timeout":
            return DomainDnsResult(
                domain=clean_domain,
                domain_status="resolved",
                mx_status="timeout",
                classification="unknown",
                reason=f"Domain '{clean_domain}' resolves in DNS ({record_type} records), but the mail routing (MX) query timed out. Deliverability cannot be reliably confirmed.",
                has_mx=False,
                has_fallback_a=False,
                mx_records=[],
                response_time_ms=duration_ms
            )

        # Case B3: MX query had temporary error (SERVFAIL/NoNameservers), but domain resolution succeeded
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="resolved",
            mx_status="unknown",
            classification="unknown",
            reason=f"Domain '{clean_domain}' resolves in DNS ({record_type} records), but mail routing (MX) query failed temporarily (SERVFAIL/unreachable nameservers).",
            has_mx=False,
            has_fallback_a=False,
            mx_records=[],
            response_time_ms=duration_ms
        )

    # Outcome C: Domain has NO address records (neither A nor AAAA)
    # Case C1: Both MX and A/AAAA returned definitive NoAnswer
    if mx_status_code == "no_answer" and not a_had_timeout and not a_had_temporary_error:
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

    # Case C2: Inconclusive lookup due to timeout
    if mx_status_code == "timeout" or a_had_timeout:
        return DomainDnsResult(
            domain=clean_domain,
            domain_status="timeout",
            mx_status="timeout" if mx_status_code == "timeout" else "unknown",
            classification="unknown",
            reason=f"DNS query for '{clean_domain}' timed out. Deliverability cannot be reliably confirmed without a live nameserver response.",
            has_mx=False,
            has_fallback_a=False,
            mx_records=[],
            response_time_ms=duration_ms
        )

    # Case C3: Inconclusive lookup due to temporary nameserver failure (SERVFAIL)
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

class BatchDomainResolver:
    """
    Coordinates domain DNS lookups for a single batch of emails.
    Guarantees that each unique domain is looked up exactly once by coalescing in-flight
    queries and caching completed results, preventing thundering herd problems.
    """
    def __init__(
        self,
        resolver: Optional[dns.asyncresolver.Resolver] = None,
        semaphore: Optional[asyncio.Semaphore] = None
    ):
        self.resolver = resolver if resolver is not None else create_resolver()
        self.semaphore = semaphore if semaphore is not None else asyncio.Semaphore(MAX_CONCURRENT_DNS_LOOKUPS)
        self.cache: Dict[str, DomainDnsResult] = {}
        self.in_flight: Dict[str, asyncio.Task[DomainDnsResult]] = {}
        self.lock = asyncio.Lock()

    async def resolve(self, domain: str) -> DomainDnsResult:
        clean_domain = domain.strip().lower().rstrip(".")
        if not clean_domain:
            return DomainDnsResult(
                domain="",
                domain_status="nonexistent",
                mx_status="none",
                classification="likely_to_bounce",
                reason="Empty domain cannot be resolved."
            )

        # Check existing cached result
        if clean_domain in self.cache:
            return self.cache[clean_domain]

        async with self.lock:
            # Recheck cache inside lock
            if clean_domain in self.cache:
                return self.cache[clean_domain]

            # If a query for this domain is already in flight, reuse it
            if clean_domain not in self.in_flight:
                async def _lookup():
                    async with self.semaphore:
                        return await inspect_domain_dns(clean_domain, self.resolver)
                self.in_flight[clean_domain] = asyncio.create_task(_lookup())

            task = self.in_flight[clean_domain]

        result = await task
        self.cache[clean_domain] = result
        return result

    # Alias for method name flexibility in testing
    resolve_domain = resolve
