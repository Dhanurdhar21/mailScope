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

        with patch("backend.main.BatchDomainResolver.resolve", new_callable=AsyncMock) as mock_dns:
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

        with patch("backend.main.BatchDomainResolver.resolve", new_callable=AsyncMock) as mock_dns:
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

        async def mock_resolve(domain):
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

        with patch("backend.main.BatchDomainResolver.resolve", side_effect=mock_resolve):
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

        with patch("backend.main.BatchDomainResolver.resolve", new_callable=AsyncMock) as mock_dns:
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

    async def test_regression_oversized_payload_returns_413(self):
        """
        REGRESSION TEST (DEFECT-04 / CWE-400):
        Verify RequestSizeLimitMiddleware rejects requests larger than MAX_REQUEST_BODY_BYTES (512KB)
        with HTTP 413 Payload Too Large.
        """
        # Create a payload of 600KB
        large_junk = "a" * (600 * 1024)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/analyze",
                headers={"Content-Type": "application/json"},
                content=large_junk
            )
            assert res.status_code == 413
            assert "exceeds maximum limit" in res.json()["detail"]

    async def test_invalid_types_and_missing_keys_rejected(self):
        """Verify invalid schema data structures return HTTP 422."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Missing emails field
            res = await client.post("/api/analyze", json={})
            assert res.status_code == 422

            # String instead of array
            res = await client.post("/api/analyze", json={"emails": "not-a-list"})
            assert res.status_code == 422

            # Null array
            res = await client.post("/api/analyze", json={"emails": None})
            assert res.status_code == 422

            # Array with non-string items
            res = await client.post("/api/analyze", json={"emails": [123, True, None]})
            assert res.status_code == 422

    async def test_summary_invariant_consistency(self):
        """Verify total = delivered + bounce + unknown invariant holds."""
        transport = ASGITransport(app=app)
        emails = [
            "valid@company.com",
            "invalid-email-format",
            "another@example.com"
        ]

        with patch("backend.main.BatchDomainResolver.resolve", new_callable=AsyncMock) as mock_resolve:
            mock_resolve.return_value = MagicMock(
                domain_status="resolved",
                mx_status="present",
                classification="likely_to_be_delivered",
                reason="OK",
                has_mx=True,
                has_fallback_a=False,
                mx_records=["mx.company.com (priority: 10)"],
                response_time_ms=1.1
            )

            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post("/api/analyze", json={"emails": emails})
                assert res.status_code == 200
                data = res.json()
                summary = data["summary"]
                assert summary["total"] == len(data["results"])
                assert summary["total"] == (
                    summary["likely_to_be_delivered"] +
                    summary["likely_to_bounce"] +
                    summary["unknown"]
                )

    async def test_forty_line_input_consistency_with_malformed_space(self):
        """
        Problem 3.B Validation:
        Forty candidates (including the malformed line 'user name@example.com'):
        - Submits 40 candidates, API returns 40 corresponding results.
        - Summary reports total = 40 == results.length.
        - Summary breakdown adds up exactly: delivered + bounce + unknown == total.
        - Candidate 'user name@example.com' remains one candidate and is classified as syntactically invalid.
        - Preserves strict 1:1 order and candidate relationship without accidental duplicates.
        """
        emails = [f"candidate{i + 1}@example.com" for i in range(39)]
        emails.insert(15, "user name@example.com") # 40 total

        transport = ASGITransport(app=app)

        with patch("backend.main.BatchDomainResolver.resolve", new_callable=AsyncMock) as mock_dns:
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

                results = data["results"]
                summary = data["summary"]

                # 1. Total results equals accepted input candidates
                assert len(results) == 40
                assert summary["total"] == 40
                assert summary["total"] == len(results)

                # 2. Strict 1:1 candidate-to-result correspondence
                assert [r["email"] for r in results] == emails

                # 3. Sum of classification counts equals summary.total
                assert (
                    summary["likely_to_be_delivered"] +
                    summary["likely_to_bounce"] +
                    summary["unknown"]
                ) == summary["total"]

                # 4. Malformed line with internal space is preserved as one candidate and marked syntactically invalid
                malformed = results[15]
                assert malformed["email"] == "user name@example.com"
                assert malformed["syntax_valid"] is False
                assert malformed["classification"] == "likely_to_bounce"
                assert "whitespace" in malformed["reason"].lower()
                assert malformed["domain_status"] == "not_checked"
                assert malformed["mx_status"] == "not_checked"

    async def test_dns_failures_do_not_cause_extra_or_missing_results(self):
        """
        Problem 3.B:
        DNS failures (timeout, servfail, nxdomain) do not cause extra or missing results.
        Every submitted email gets exactly one result.
        """
        emails = [
            "user1@healthy.com",
            "user2@timeout.com",
            "user3@servfail.com",
            "user4@nxdomain.com",
            "user5@syntax-fail"
        ]

        transport = ASGITransport(app=app)

        async def mock_resolve(domain):
            if domain == "healthy.com":
                return MagicMock(
                    domain_status="resolved",
                    mx_status="present",
                    classification="likely_to_be_delivered",
                    reason="Active MX",
                    has_mx=True,
                    has_fallback_a=False,
                    mx_records=["mx.healthy.com"],
                    response_time_ms=1.0
                )
            elif domain == "timeout.com":
                return MagicMock(
                    domain_status="timeout",
                    mx_status="timeout",
                    classification="unknown",
                    reason="Query timed out",
                    has_mx=False,
                    has_fallback_a=False,
                    mx_records=[],
                    response_time_ms=5.0
                )
            elif domain == "servfail.com":
                return MagicMock(
                    domain_status="unknown",
                    mx_status="unknown",
                    classification="unknown",
                    reason="SERVFAIL",
                    has_mx=False,
                    has_fallback_a=False,
                    mx_records=[],
                    response_time_ms=2.0
                )
            elif domain == "nxdomain.com":
                return MagicMock(
                    domain_status="nonexistent",
                    mx_status="none",
                    classification="likely_to_bounce",
                    reason="NXDOMAIN",
                    has_mx=False,
                    has_fallback_a=False,
                    mx_records=[],
                    response_time_ms=1.5
                )

        with patch("backend.main.BatchDomainResolver.resolve", side_effect=mock_resolve):
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post("/api/analyze", json={"emails": emails})
                assert res.status_code == 200
                data = res.json()

                results = data["results"]
                summary = data["summary"]

                assert len(results) == 5
                assert summary["total"] == 5
                assert [r["email"] for r in results] == emails
                assert (
                    summary["likely_to_be_delivered"] +
                    summary["likely_to_bounce"] +
                    summary["unknown"]
                ) == summary["total"]


