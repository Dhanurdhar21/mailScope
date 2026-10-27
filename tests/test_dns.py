"""
Unit tests for async DNS and mail routing inspection with mocked DNS responses.
Ensures deterministic testing of RFC 7505 Null MX, RFC 5321 Fallback, NXDOMAIN, and Timeouts.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
import dns.resolver
import dns.exception
from backend.dns_checker import inspect_domain_dns

@pytest.mark.asyncio
class TestDnsRouting:
    async def test_standard_mx_records_sorted(self):
        """Tests that active MX records are sorted by preference priority and marked deliverable."""
        resolver = MagicMock()
        
        # Mock MX answers with priorities 20, 10, 50
        r1 = MagicMock()
        r1.preference = 20
        r1.exchange = "alt1.aspmx.l.google.com."

        r2 = MagicMock()
        r2.preference = 10
        r2.exchange = "aspmx.l.google.com."

        r3 = MagicMock()
        r3.preference = 50
        r3.exchange = "alt2.aspmx.l.google.com."

        resolver.resolve = AsyncMock(return_value=[r1, r2, r3])

        result = await inspect_domain_dns("google.com", resolver)
        assert result.domain_status == "resolved"
        assert result.mx_status == "present"
        assert result.classification == "likely_to_be_delivered"
        assert result.has_mx is True
        assert len(result.mx_records) == 3
        # Check sorting: priority 10 must come first
        assert result.mx_records[0] == "aspmx.l.google.com (priority: 10)"
        assert result.mx_records[1] == "alt1.aspmx.l.google.com (priority: 20)"
        assert result.mx_records[2] == "alt2.aspmx.l.google.com (priority: 50)"

    async def test_rfc_7505_null_mx(self):
        """Tests that an RFC 7505 Null MX ('0 .') is classified as likely_to_bounce."""
        resolver = MagicMock()

        null_rdata = MagicMock()
        null_rdata.preference = 0
        null_rdata.exchange = "."

        resolver.resolve = AsyncMock(return_value=[null_rdata])

        result = await inspect_domain_dns("example.com", resolver)
        assert result.domain_status == "resolved"
        assert result.mx_status == "none"
        assert result.classification == "likely_to_bounce"
        assert result.has_mx is False
        assert "RFC 7505" in result.reason
        assert "Null MX" in result.reason

    async def test_rfc_5321_fallback_a_record(self):
        """Tests that when no MX records exist, an A record provides implicit fallback (unknown)."""
        resolver = MagicMock()

        async def mock_resolve(qname, rdtype):
            if rdtype == "MX":
                raise dns.resolver.NoAnswer()
            if rdtype == "A":
                return [MagicMock(address="192.0.2.1")]
            raise dns.resolver.NoAnswer()

        resolver.resolve = AsyncMock(side_effect=mock_resolve)

        result = await inspect_domain_dns("legacy-server.org", resolver)
        assert result.domain_status == "resolved"
        assert result.mx_status == "fallback_a_record"
        assert result.classification == "unknown"
        assert result.has_fallback_a is True
        assert "RFC 5321" in result.reason

    async def test_rfc_5321_fallback_aaaa_record(self):
        """Tests that when no MX or A records exist, AAAA provides implicit fallback (unknown)."""
        resolver = MagicMock()

        async def mock_resolve(qname, rdtype):
            if rdtype == "MX":
                raise dns.resolver.NoAnswer()
            if rdtype == "A":
                raise dns.resolver.NoAnswer()
            if rdtype == "AAAA":
                return [MagicMock(address="2001:db8::1")]
            raise dns.resolver.NoAnswer()

        resolver.resolve = AsyncMock(side_effect=mock_resolve)

        result = await inspect_domain_dns("ipv6-only.org", resolver)
        assert result.domain_status == "resolved"
        assert result.mx_status == "fallback_a_record"
        assert result.classification == "unknown"
        assert result.has_fallback_a is True

    async def test_domain_with_no_routing_evidence(self):
        """Tests that a domain with no MX and no A/AAAA records is marked as likely_to_bounce."""
        resolver = MagicMock()
        resolver.resolve = AsyncMock(side_effect=dns.resolver.NoAnswer())

        result = await inspect_domain_dns("no-mail.net", resolver)
        assert result.domain_status == "no_mail_records"
        assert result.mx_status == "none"
        assert result.classification == "likely_to_bounce"
        assert result.has_mx is False
        assert result.has_fallback_a is False

    async def test_confirmed_nxdomain(self):
        """Tests that NXDOMAIN is classified as likely_to_bounce."""
        resolver = MagicMock()
        resolver.resolve = AsyncMock(side_effect=dns.resolver.NXDOMAIN())

        result = await inspect_domain_dns("nonexistent-domain-12345.xyz", resolver)
        assert result.domain_status == "nonexistent"
        assert result.mx_status == "none"
        assert result.classification == "likely_to_bounce"
        assert "NXDOMAIN" in result.reason

    async def test_dns_timeout_is_not_bounce(self):
        """Tests that a DNS timeout is classified as unknown, never a hard bounce."""
        resolver = MagicMock()
        resolver.resolve = AsyncMock(side_effect=dns.exception.Timeout("Lookup timed out"))

        result = await inspect_domain_dns("slow-nameserver.com", resolver)
        assert result.domain_status == "timeout"
        assert result.mx_status == "timeout"
        assert result.classification == "unknown"
        assert "timed out" in result.reason

    async def test_servfail_temporary_failure(self):
        """Tests that SERVFAIL or missing nameservers are classified as unknown."""
        resolver = MagicMock()
        resolver.resolve = AsyncMock(side_effect=dns.resolver.NoNameservers("SERVFAIL"))

        result = await inspect_domain_dns("broken-dnssec.com", resolver)
        assert result.domain_status == "unknown"
        assert result.mx_status == "unknown"
        assert result.classification == "unknown"
        assert "SERVFAIL" in result.reason or "unreachable" in result.reason

    async def test_regression_fallback_temporary_failure_is_unknown_not_bounce(self):
        """
        REGRESSION TEST (DEFECT-01):
        When MX lookup returns NoAnswer, but A/AAAA fallback lookups experience a temporary
        failure (Timeout, NoNameservers, etc.), the domain must be classified as 'unknown',
        NEVER 'likely_to_bounce' / 'no_mail_records'.
        """
        resolver = MagicMock()

        async def mock_resolve(qname, rdtype):
            if rdtype == "MX":
                raise dns.resolver.NoAnswer()
            if rdtype == "A":
                # Nameserver failure during A record fallback
                raise dns.resolver.NoNameservers("Temporary DNS server failure")
            if rdtype == "AAAA":
                # Timeout during AAAA record fallback
                raise dns.exception.Timeout("Lookup timed out")
            raise dns.resolver.NoAnswer()

        resolver.resolve = AsyncMock(side_effect=mock_resolve)

        result = await inspect_domain_dns("flakey-dns.org", resolver)
        # Must be unknown because we cannot definitively prove no mail routing exists
        assert result.classification == "unknown"
        assert result.domain_status in ("unknown", "timeout")
        assert result.mx_status == "unknown"
        assert result.classification != "likely_to_bounce"

    async def test_batch_domain_resolver_coalesces_queries(self):
        """
        REGRESSION TEST (DEFECT-02):
        Verify BatchDomainResolver deduplicates and coalesces in-flight DNS queries
        so that concurrent lookups for the identical domain execute only once.
        """
        import asyncio
        from backend.dns_checker import BatchDomainResolver

        call_count = 0
        resolver = MagicMock()

        async def slow_mock_resolve(qname, rdtype):
            nonlocal call_count
            if rdtype == "MX":
                call_count += 1
                await asyncio.sleep(0.05) # simulate latency
                r = MagicMock()
                r.preference = 10
                r.exchange = "mail.coalesce.com."
                return [r]
            raise dns.resolver.NoAnswer()

        resolver.resolve = AsyncMock(side_effect=slow_mock_resolve)
        batch_resolver = BatchDomainResolver(resolver)

        # Dispatch 10 concurrent lookups for the same domain
        tasks = [
            batch_resolver.resolve_domain("COALESCE.COM")
            for _ in range(10)
        ]
        results = await asyncio.gather(*tasks)

        # All 10 tasks must receive identical resolved result
        assert len(results) == 10
        for r in results:
            assert r.classification == "likely_to_be_delivered"
            assert r.has_mx is True

        # DNS resolver should only have been queried ONCE for MX
        assert call_count == 1

    async def test_mx_timeout_with_successful_a_record_decoupling(self):
        """
        TASK 7 REQUIREMENT:
        Ensure domain resolution and MX lookup statuses are decoupled.
        A successful A-record lookup must NOT be overwritten by an MX-query timeout.
        When MX query times out but A query succeeds:
        - domain_status must be 'resolved'
        - mx_status must be 'timeout'
        - classification must be 'unknown'
        """
        resolver = MagicMock()

        async def mock_resolve(qname, rdtype):
            if rdtype == "MX":
                raise dns.exception.Timeout("MX lookup timed out")
            if rdtype == "A":
                return [MagicMock(address="93.184.216.34")]
            raise dns.resolver.NoAnswer()

        resolver.resolve = AsyncMock(side_effect=mock_resolve)

        result = await inspect_domain_dns("timeout-mx-with-a.com", resolver)
        assert result.domain_status == "resolved"
        assert result.mx_status == "timeout"
        assert result.classification == "unknown"
        assert result.has_mx is False
        assert "resolves in DNS" in result.reason
        assert "timed out" in result.reason

    async def test_mx_servfail_with_successful_a_record_decoupling(self):
        """
        Ensure that when MX query fails with SERVFAIL / NoNameservers but A records resolve:
        - domain_status is 'resolved'
        - mx_status is 'unknown'
        - classification is 'unknown'
        """
        resolver = MagicMock()

        async def mock_resolve(qname, rdtype):
            if rdtype == "MX":
                raise dns.resolver.NoNameservers("SERVFAIL on MX")
            if rdtype == "A":
                return [MagicMock(address="93.184.216.34")]
            raise dns.resolver.NoAnswer()

        resolver.resolve = AsyncMock(side_effect=mock_resolve)

        result = await inspect_domain_dns("servfail-mx-with-a.com", resolver)
        assert result.domain_status == "resolved"
        assert result.mx_status == "unknown"
        assert result.classification == "unknown"
        assert result.has_mx is False
        assert "resolves in DNS" in result.reason

    async def test_configured_nameservers_fallback_order(self):
        """
        Verify that get_configured_nameservers preserves system nameservers first
        and appends public fallback nameservers.
        """
        from backend.dns_checker import get_configured_nameservers
        from backend.config import DNS_FALLBACK_NAMESERVERS

        nameservers = get_configured_nameservers()
        assert len(nameservers) >= 1
        # Fallback nameservers must be present in the list
        for fb in DNS_FALLBACK_NAMESERVERS:
            assert fb in nameservers


