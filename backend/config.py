"""
Configuration settings for MailScope Backend API.
Loads environment variables safely with robust defaults.
"""

import os
from typing import List

# API Service Metadata
SERVICE_NAME: str = "mailscope-analyzer"
VERSION: str = "1.0.0"

# CORS Configuration
# Comma-separated list of allowed origins, or '*' for permissive dev
CORS_ORIGINS_RAW: str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
)

if CORS_ORIGINS_RAW.strip() == "*":
    CORS_ORIGINS: List[str] = ["*"]
else:
    CORS_ORIGINS: List[str] = [
        origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()
    ]

# DNS Configuration
# Optional: explicitly set comma-separated custom nameservers (e.g. enterprise DNS)
DNS_NAMESERVERS_RAW: str = os.getenv("DNS_NAMESERVERS", "")
if DNS_NAMESERVERS_RAW.strip():
    DNS_NAMESERVERS: List[str] = [
        ns.strip() for ns in DNS_NAMESERVERS_RAW.split(",") if ns.strip()
    ]
else:
    DNS_NAMESERVERS: List[str] = []

# Fallback nameservers used if system nameservers are unreachable or timeout
# Set to 'none', 'false', or '0' to disable external fallback
DNS_FALLBACK_NAMESERVERS_RAW: str = os.getenv(
    "DNS_FALLBACK_NAMESERVERS",
    "1.1.1.1,8.8.8.8,1.0.0.1,8.8.4.4"
)
if DNS_FALLBACK_NAMESERVERS_RAW.strip().lower() in ("none", "false", "0"):
    DNS_FALLBACK_NAMESERVERS: List[str] = []
else:
    DNS_FALLBACK_NAMESERVERS: List[str] = [
        ns.strip() for ns in DNS_FALLBACK_NAMESERVERS_RAW.split(",") if ns.strip()
    ]

DNS_TIMEOUT_SECONDS: float = float(os.getenv("DNS_TIMEOUT_SECONDS", "2.0"))
DNS_LIFETIME_SECONDS: float = float(os.getenv("DNS_LIFETIME_SECONDS", "5.0"))
MAX_CONCURRENT_DNS_LOOKUPS: int = int(os.getenv("MAX_CONCURRENT_DNS_LOOKUPS", "25"))

# API Batch Constraints
MAX_EMAIL_BATCH_SIZE: int = int(os.getenv("MAX_EMAIL_BATCH_SIZE", "200"))
MAX_REQUEST_BODY_BYTES: int = 512 * 1024  # 512 KB
