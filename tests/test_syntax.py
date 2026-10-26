"""
Unit tests for email syntax and normalization validation (RFC 5321 / RFC 5322).
"""

import pytest
from backend.syntax import validate_email_syntax

class TestEmailSyntax:
    def test_valid_standard_emails(self):
        valid_cases = [
            "alex@example.com",
            "jordan.smith@company.org",
            "contact_us@sample.net",
            "first.last@sub.domain.co.uk",
            "support-team@service.io"
        ]
        for email in valid_cases:
            res = validate_email_syntax(email)
            assert res.is_valid, f"Expected {email} to be valid, but got: {res.error_reason}"
            assert res.error_reason is None
            assert res.normalized_email == email.lower()

    def test_plus_addressing(self):
        res = validate_email_syntax("user+newsletter@gmail.com")
        assert res.is_valid
        assert res.local_part == "user+newsletter"
        assert res.domain == "gmail.com"

    def test_special_valid_characters(self):
        # RFC 5322 allowed special chars in local-part: !#$%&'*+-/=?^_`{|}~
        email = "test.email!#$%&'*+-/=?^_`{|}~@example.com"
        res = validate_email_syntax(email)
        assert res.is_valid

    def test_empty_and_whitespace(self):
        assert not validate_email_syntax("").is_valid
        assert not validate_email_syntax("   ").is_valid
        assert not validate_email_syntax("user @example.com").is_valid
        assert not validate_email_syntax("user@ example.com").is_valid

    def test_missing_delimiter_or_parts(self):
        # Missing @
        res = validate_email_syntax("invalidaddress.com")
        assert not res.is_valid
        assert "Missing '@'" in res.error_reason

        # Multiple @
        res = validate_email_syntax("user@@example.com")
        assert not res.is_valid
        assert "Multiple '@'" in res.error_reason

        # Missing local part
        res = validate_email_syntax("@example.com")
        assert not res.is_valid
        assert "Missing local-part" in res.error_reason

        # Missing domain
        res = validate_email_syntax("user@")
        assert not res.is_valid
        assert "Missing domain" in res.error_reason

    def test_dot_atom_violations(self):
        # Leading dot in local-part
        res = validate_email_syntax(".user@example.com")
        assert not res.is_valid
        assert "cannot begin with a period" in res.error_reason

        # Trailing dot in local-part
        res = validate_email_syntax("user.@example.com")
        assert not res.is_valid
        assert "cannot end with a period" in res.error_reason

        # Consecutive dots in local-part
        res = validate_email_syntax("user..name@example.com")
        assert not res.is_valid
        assert "consecutive periods" in res.error_reason

        # Leading dot in domain
        res = validate_email_syntax("user@.example.com")
        assert not res.is_valid

        # Trailing dot in domain
        res = validate_email_syntax("user@example.com.")
        assert not res.is_valid

        # Consecutive dots in domain
        res = validate_email_syntax("user@example..com")
        assert not res.is_valid

    def test_length_limits(self):
        # Total length > 254
        long_email = "a" * 245 + "@example.com"
        assert len(long_email) > 254
        res = validate_email_syntax(long_email)
        assert not res.is_valid
        assert "exceeds maximum RFC 5321 limit of 254" in res.error_reason

        # Local part > 64
        long_local = "a" * 65 + "@example.com"
        res = validate_email_syntax(long_local)
        assert not res.is_valid
        assert "exceeds maximum RFC 5321 limit of 64" in res.error_reason

        # Domain label > 63
        long_label_domain = "user@" + "a" * 64 + ".com"
        res = validate_email_syntax(long_label_domain)
        assert not res.is_valid
        assert "exceeds maximum DNS limit of 63" in res.error_reason

    def test_internationalized_domains(self):
        # IDN domain: münchen.de -> xn--mnchen-3ya.de
        res = validate_email_syntax("kontakt@münchen.de")
        assert res.is_valid
        assert res.ascii_domain == "xn--mnchen-3ya.de"
        assert res.domain == "münchen.de"

    def test_disposable_domain_detection(self):
        res = validate_email_syntax("tempuser@mailinator.com")
        assert res.is_valid
        assert res.is_disposable is True

        res = validate_email_syntax("regular@google.com")
        assert res.is_valid
        assert res.is_disposable is False
