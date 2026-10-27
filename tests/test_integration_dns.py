"""
Integration tests for real DNS behavior against live domains.
Marked as integration so they can be run selectively.
"""

import pytest
import dns.asyncresolver
from backend.dns_checker import inspect_domain_dns

@pytest.mark.asyncio
@pytest.mark.integration
class TestLiveDnsIntegration:
    async def test_live_gmail_domain(self):
        """Tests that google.com returns active MX records and is marked likely_to_be_delivered."""
        resolver = dns.asyncresolver.Resolver()
        resolver.timeout = 3.0
        resolver.lifetime = 3.0

        result = await inspect_domain_dns("google.com", resolver)
        assert result.domain_status == "resolved"
        assert result.mx_status == "present"
        assert result.classification == "likely_to_be_delivered"
        assert result.has_mx is True
        assert len(result.mx_records) > 0

    async def test_live_nonexistent_domain(self):
        """Tests that a guaranteed non-existent domain returns NXDOMAIN and likely_to_bounce."""
        resolver = dns.asyncresolver.Resolver()
        resolver.timeout = 3.0
        resolver.lifetime = 3.0

        result = await inspect_domain_dns("nonexistent-test-domain-404-xyz987654321.com", resolver)
        assert result.domain_status == "nonexistent"
        assert result.mx_status == "none"
        assert result.classification == "likely_to_bounce"
        assert result.has_mx is False

    async def test_live_null_mx_2outlook(self):
        """
        Tests that 2outlook.com resolves through configured nameservers,
        identifies the RFC 7505 Null MX record, and classifies as likely_to_bounce.
        """
        from backend.dns_checker import create_resolver
        resolver = create_resolver()

        result = await inspect_domain_dns("2outlook.com", resolver)
        assert result.domain_status == "resolved"
        assert result.mx_status == "none"
        assert result.classification == "likely_to_bounce"
        assert result.has_mx is False
        assert "RFC 7505" in result.reason
        assert "Null MX" in result.reason
        assert any("RFC 7505 Null MX" in mx for mx in result.mx_records)
