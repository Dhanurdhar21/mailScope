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
DNS_TIMEOUT_SECONDS: float = float(os.getenv("DNS_TIMEOUT_SECONDS", "2.5"))
DNS_LIFETIME_SECONDS: float = float(os.getenv("DNS_LIFETIME_SECONDS", "3.0"))
MAX_CONCURRENT_DNS_LOOKUPS: int = int(os.getenv("MAX_CONCURRENT_DNS_LOOKUPS", "25"))

# API Batch Constraints
MAX_EMAIL_BATCH_SIZE: int = int(os.getenv("MAX_EMAIL_BATCH_SIZE", "200"))
MAX_REQUEST_BODY_BYTES: int = 512 * 1024  # 512 KB
