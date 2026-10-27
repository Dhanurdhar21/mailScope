"""
Performance and Resilience Benchmark for MailScope.
Evaluates batch processing throughput, latency scaling, and query coalescing
across batch sizes 1, 10, 50, 100, and 200 addresses.
"""

import asyncio
import time
import statistics
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
import dns.resolver
from backend.main import app
from backend.dns_checker import BatchDomainResolver

async def benchmark_batch_sizes():
    transport = ASGITransport(app=app)
    results_summary = []

    batch_sizes = [1, 10, 50, 100, 200]

    for size in batch_sizes:
        # Scenario A: All addresses share the same domain (Tests BatchDomainResolver coalescing)
        shared_emails = [f"user{i}@shared-domain.com" for i in range(size)]

        resolver_call_count = 0
        async def mock_dns_resolve(qname, rdtype):
            nonlocal resolver_call_count
            if rdtype == "MX":
                resolver_call_count += 1
                await asyncio.sleep(0.002) # 2ms mock network latency
                r = MagicMock()
                r.preference = 10
                r.exchange = "mail.shared-domain.com."
                return [r]
            raise dns.resolver.NoAnswer()

        mock_resolver = MagicMock()
        mock_resolver.resolve = AsyncMock(side_effect=mock_dns_resolve)

        runs = 5
        durations = []

        for _ in range(runs):
            resolver_call_count = 0
            start = time.perf_counter()
            from unittest.mock import patch
            with patch("backend.main.get_resolver", return_value=mock_resolver):
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    res = await client.post("/api/analyze", json={"emails": shared_emails})
                    assert res.status_code == 200
            durations.append((time.perf_counter() - start) * 1000)

        avg_ms = round(statistics.mean(durations), 2)
        med_ms = round(statistics.median(durations), 2)
        max_ms = round(max(durations), 2)

        results_summary.append({
            "batch_size": size,
            "scenario": "Shared Domain (Coalesced)",
            "runs": runs,
            "mean_latency_ms": avg_ms,
            "median_latency_ms": med_ms,
            "max_latency_ms": max_ms,
            "queries_executed": resolver_call_count
        })

    # Scenario B: 50 Distinct Domains (High Concurrency)
    distinct_emails = [f"user{i}@unique-domain-{i}.com" for i in range(50)]
    call_count_distinct = 0
    async def mock_resolve_distinct(domain):
        nonlocal call_count_distinct
        call_count_distinct += 1
        await asyncio.sleep(0.005) # 5ms mock latency per distinct lookup
        return MagicMock(
            domain_status="resolved",
            mx_status="present",
            classification="likely_to_be_delivered",
            reason="Domain resolves with active MX.",
            has_mx=True,
            has_fallback_a=False,
            mx_records=[f"mail.{domain} (priority: 10)"],
            response_time_ms=5.0
        )

    start = time.perf_counter()
    from unittest.mock import patch
    with patch("backend.main.BatchDomainResolver.resolve", side_effect=mock_resolve_distinct):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/analyze", json={"emails": distinct_emails})
            assert res.status_code == 200
    distinct_duration_ms = round((time.perf_counter() - start) * 1000, 2)

    results_summary.append({
        "batch_size": 50,
        "scenario": "Distinct Domains (Concurrent)",
        "runs": 1,
        "mean_latency_ms": distinct_duration_ms,
        "median_latency_ms": distinct_duration_ms,
        "max_latency_ms": distinct_duration_ms,
        "queries_executed": call_count_distinct
    })

    print("\n================== BENCHMARK RESULTS ==================")
    print(f"{'Batch Size':<12} | {'Scenario':<30} | {'Mean (ms)':<10} | {'Median (ms)':<12} | {'Max (ms)':<10} | {'Queries':<8}")
    print("-" * 95)
    for r in results_summary:
        print(f"{r['batch_size']:<12} | {r['scenario']:<30} | {r['mean_latency_ms']:<10.2f} | {r['median_latency_ms']:<12.2f} | {r['max_latency_ms']:<10.2f} | {r['queries_executed']:<8}")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(benchmark_batch_sizes())
