"""
API Integration and schema compatibility tests for MailScope.
Tests /health, /api/analyze, CORS, batch limits, and error handling with AsyncClient.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from backend.main import app

@pytest.mark.asyncio
class TestApiEndpoints:
    async def test_health_check_endpoint(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/health")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "ok"
            assert data["service"] == "mailscope-analyzer"
            assert "version" in data
            assert "timestamp" in data
            assert data["dns_resolver"] == "active"

    async def test_empty_emails_list_rejected(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/analyze", json={"emails": []})
            assert res.status_code in (400, 422)
            assert "detail" in res.json()

    async def test_max_batch_size_accepted(self):
        # 200 emails should be accepted
        emails = [f"user{i}@example.com" for i in range(200)]
        transport = ASGITransport(app=app)

        with patch("backend.main.inspect_domain_cached") as mock_dns:
            mock_res = MagicMock(
                domain_status="resolved",
                mx_status="present",
                classification="likely_to_be_delivered",
                reason="Domain resolves with active MX.",
                has_mx=True,
                has_fallback_a=False,
                mx_records=["mail.example.com (priority: 10)"],
                response_time_ms=1.5
            )
            mock_dns.return_value = mock_res

            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post("/api/analyze", json={"emails": emails})
                assert res.status_code == 200
                data = res.json()
                assert len(data["results"]) == 200
                assert data["summary"]["total"] == 200

    async def test_batch_exceeding_limit_rejected(self):
        # 201 emails should be rejected with 422
        emails = [f"user{i}@example.com" for i in range(201)]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/analyze", json={"emails": emails})
            assert res.status_code == 422
            assert "detail" in res.json()

    async def test_duplicate_addresses_handled(self):
        emails = ["dup@example.com", "dup@example.com"]
        transport = ASGITransport(app=app)

        with patch("backend.main.inspect_domain_cached") as mock_dns:
            mock_res = MagicMock(
                domain_status="resolved",
                mx_status="present",
                classification="likely_to_be_delivered",
                reason="Domain resolves with active MX.",
                has_mx=True,
                has_fallback_a=False,
                mx_records=["mail.example.com (priority: 10)"],
                response_time_ms=1.2
            )
            mock_dns.return_value = mock_res

            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post("/api/analyze", json={"emails": emails})
                assert res.status_code == 200
                data = res.json()
                assert len(data["results"]) == 2
                assert data["summary"]["total"] == 2

    async def test_single_dns_failure_does_not_crash_batch(self):
        emails = ["valid@good.com", "valid@broken.com"]
        transport = ASGITransport(app=app)

        async def mock_inspect(domain, resolver, cache, sem):
            if domain == "good.com":
                return MagicMock(
                    domain_status="resolved",
                    mx_status="present",
                    classification="likely_to_be_delivered",
                    reason="OK",
                    has_mx=True,
                    has_fallback_a=False,
                    mx_records=["mx.good.com (priority: 10)"],
                    response_time_ms=1.0
                )
            else:
                return MagicMock(
                    domain_status="unknown",
                    mx_status="unknown",
                    classification="unknown",
                    reason="Temporary SERVFAIL",
                    has_mx=False,
                    has_fallback_a=False,
                    mx_records=[],
                    response_time_ms=1.0
                )

        with patch("backend.main.inspect_domain_cached", side_effect=mock_inspect):
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post("/api/analyze", json={"emails": emails})
                assert res.status_code == 200
                data = res.json()
                assert len(data["results"]) == 2
                assert data["results"][0]["classification"] == "likely_to_be_delivered"
                assert data["results"][1]["classification"] == "unknown"
                assert data["summary"]["likely_to_be_delivered"] == 1
                assert data["summary"]["unknown"] == 1

    async def test_malformed_json_body(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/analyze",
                headers={"Content-Type": "application/json"},
                content="not valid json"
            )
            assert res.status_code == 422

    async def test_frontend_schema_contract(self):
        """Verifies that all fields expected by the TypeScript frontend interface are present."""
        emails = ["contact@company.com", "bad-email"]
        transport = ASGITransport(app=app)

        with patch("backend.main.inspect_domain_cached") as mock_dns:
            mock_res = MagicMock(
                domain_status="resolved",
                mx_status="present",
                classification="likely_to_be_delivered",
                reason="OK",
                has_mx=True,
                has_fallback_a=False,
                mx_records=["mx.company.com (priority: 10)"],
                response_time_ms=2.1
            )
            mock_dns.return_value = mock_res

            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post("/api/analyze", json={"emails": emails})
                assert res.status_code == 200
                data = res.json()

                # Check top-level structure
                assert "results" in data
                assert "summary" in data

                # Check summary fields
                summary = data["summary"]
                assert isinstance(summary["total"], int)
                assert isinstance(summary["likely_to_be_delivered"], int)
                assert isinstance(summary["likely_to_bounce"], int)
                assert isinstance(summary["unknown"], int)
                assert isinstance(summary["duration_ms"], (int, float))

                # Check result item fields
                first = data["results"][0]
                expected_fields = [
                    "email", "normalized_email", "syntax_valid", "domain",
                    "domain_status", "mx_status", "classification", "reason", "diagnostics"
                ]
                for f in expected_fields:
                    assert f in first, f"Missing required frontend field: {f}"

                # Check diagnostics subfields
                diag = first["diagnostics"]
                diag_fields = [
                    "has_mx", "has_fallback_a", "mx_records", "is_disposable", "response_time_ms"
                ]
                for f in diag_fields:
                    assert f in diag, f"Missing required diagnostics field: {f}"

    async def test_cors_preflight(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.options(
                "/api/analyze",
                headers={
                    "Origin": "http://localhost:5173",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type"
                }
            )
            assert res.status_code == 200
            assert "access-control-allow-origin" in res.headers
