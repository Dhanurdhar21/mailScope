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
