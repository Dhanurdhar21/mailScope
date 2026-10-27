"""
Email Syntax and Normalization Validator for MailScope.
Implements RFC 5321 and RFC 5322 syntax validation, length rules, and IDNA support.
Defensively protects against null bytes, control characters, and malformed inputs.
"""

from dataclasses import dataclass
from typing import Optional, Set
import idna
import re

# RFC 5322 Section 3.2.3 valid atext characters for unquoted local-part
VALID_LOCAL_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&'*+-/=?^_`{|}~.")

# Label character regex (alphanumeric and hyphens, not starting or ending with hyphen)
DOMAIN_LABEL_REGEX = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$")

# Known temporary/disposable email providers for diagnostic insight
DISPOSABLE_DOMAINS: Set[str] = {
    "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
    "trashmail.com", "sharklasers.com", "dispostable.com", "yopmail.com",
    "getairmail.com", "fakeinbox.com", "throwawaymail.com", "temp-mail.org"
}

@dataclass
class SyntaxValidationResult:
    is_valid: bool
    normalized_email: str
    local_part: str
    domain: str
    ascii_domain: str
    error_reason: Optional[str] = None
    is_disposable: bool = False

def validate_email_syntax(raw_email: object) -> SyntaxValidationResult:
    """
    Validates an email address against RFC 5321 and RFC 5322 rules.
    Performs length, character, dot-atom, and IDNA domain label validation.
    """
    if not isinstance(raw_email, str):
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email="",
            local_part="",
            domain="",
            ascii_domain="",
            error_reason="Email address must be a string."
        )

    # 1. Null byte injection check
    if "\x00" in raw_email:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=raw_email.replace("\x00", ""),
            local_part="",
            domain="",
            ascii_domain="",
            error_reason="Email address contains prohibited null bytes."
        )

    # 2. Control characters check (ASCII 0-31 or 127)
    if any(ord(c) < 32 or ord(c) == 127 for c in raw_email):
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=raw_email.strip(),
            local_part="",
            domain="",
            ascii_domain="",
            error_reason="Email address contains unencoded control characters."
        )

    clean_email = raw_email.strip()

    # 3. Empty or whitespace check
    if not clean_email:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email="",
            local_part="",
            domain="",
            ascii_domain="",
            error_reason="Empty email string provided."
        )

    # 4. Check for whitespace inside address
    if any(char.isspace() for char in clean_email):
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part="",
            domain="",
            ascii_domain="",
            error_reason="Address contains unquoted whitespace characters."
        )

    # 5. Overall length check (RFC 5321 section 4.5.3.1.3: max 254 octets)
    if len(clean_email) > 254:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part="",
            domain="",
            ascii_domain="",
            error_reason=f"Address length ({len(clean_email)}) exceeds maximum RFC 5321 limit of 254 characters."
        )

    # 6. '@' delimiter check
    if "@" not in clean_email:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=clean_email,
            domain="",
            ascii_domain="",
            error_reason="Missing '@' symbol delimiter."
        )

    parts = clean_email.split("@")
    if len(parts) > 2:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=parts[0],
            domain="@".join(parts[1:]),
            ascii_domain="",
            error_reason="Multiple '@' symbols found in address."
        )

    local_part, domain_part = parts[0], parts[1]

    # 7. Local-part validation (RFC 5321 section 4.5.3.1.1: max 64 characters)
    if not local_part:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part="",
            domain=domain_part,
            ascii_domain="",
            error_reason="Missing local-part before '@'."
        )

    if len(local_part) > 64:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason=f"Local-part length ({len(local_part)}) exceeds maximum RFC 5321 limit of 64 characters."
        )

    if local_part.startswith("."):
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason="Local-part cannot begin with a period ('.')."
        )

    if local_part.endswith("."):
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason="Local-part cannot end with a period ('.')."
        )

    if ".." in local_part:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason="Local-part cannot contain consecutive periods ('..')."
        )

    # Validate characters in local-part
    invalid_local_chars = [c for c in local_part if c not in VALID_LOCAL_CHARS]
    if invalid_local_chars:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason=f"Local-part contains invalid character(s): '{''.join(set(invalid_local_chars))}'."
        )

    # 8. Domain-part validation
    if not domain_part:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain="",
            ascii_domain="",
            error_reason="Missing domain part after '@'."
        )

    if domain_part.startswith("."):
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason="Domain cannot begin with a period ('.')."
        )

    if domain_part.endswith("."):
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason="Domain cannot end with a period ('.')."
        )

    if ".." in domain_part:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason="Domain cannot contain consecutive periods ('..')."
        )

    # Pre-check domain label lengths before IDNA processing
    raw_labels = domain_part.split(".")
    for raw_label in raw_labels:
        if len(raw_label) > 63:
            return SyntaxValidationResult(
                is_valid=False,
                normalized_email=clean_email,
                local_part=local_part,
                domain=domain_part,
                ascii_domain="",
                error_reason=f"Domain label '{raw_label}' exceeds maximum DNS limit of 63 characters."
            )

    # Convert Internationalized Domain Names (IDN) via IDNA (RFC 5891)
    try:
        ascii_domain = idna.encode(domain_part.lower()).decode("ascii")
    except Exception as e:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain="",
            error_reason=f"Domain failed IDNA encoding: {str(e)}"
        )

    # Domain overall length (RFC 1035 section 2.3.4: max 255 octets)
    if len(ascii_domain) > 253:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain=ascii_domain,
            error_reason=f"Domain length ({len(ascii_domain)}) exceeds maximum DNS limit of 253 characters."
        )

    # Validate individual domain labels
    labels = ascii_domain.split(".")
    if len(labels) < 2:
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain=ascii_domain,
            error_reason="Domain must contain at least one dot separating name and top-level domain (TLD)."
        )

    for label in labels:
        if not label:
            return SyntaxValidationResult(
                is_valid=False,
                normalized_email=clean_email,
                local_part=local_part,
                domain=domain_part,
                ascii_domain=ascii_domain,
                error_reason="Domain contains an empty label."
            )
        if len(label) > 63:
            return SyntaxValidationResult(
                is_valid=False,
                normalized_email=clean_email,
                local_part=local_part,
                domain=domain_part,
                ascii_domain=ascii_domain,
                error_reason=f"Domain label '{label}' exceeds maximum DNS limit of 63 characters."
            )
        if not DOMAIN_LABEL_REGEX.match(label):
            return SyntaxValidationResult(
                is_valid=False,
                normalized_email=clean_email,
                local_part=local_part,
                domain=domain_part,
                ascii_domain=ascii_domain,
                error_reason=f"Domain label '{label}' contains invalid characters or leading/trailing hyphens."
            )

    # Check TLD is not purely numeric (ICANN/RFC standard)
    tld = labels[-1]
    if tld.isdigit():
        return SyntaxValidationResult(
            is_valid=False,
            normalized_email=clean_email,
            local_part=local_part,
            domain=domain_part,
            ascii_domain=ascii_domain,
            error_reason=f"Top-level domain '{tld}' cannot be purely numeric."
        )

    # Successful syntax validation
    normalized = f"{local_part.lower()}@{ascii_domain.lower()}"
    is_disp = ascii_domain.lower() in DISPOSABLE_DOMAINS

    return SyntaxValidationResult(
        is_valid=True,
        normalized_email=normalized,
        local_part=local_part,
        domain=domain_part.lower(),
        ascii_domain=ascii_domain.lower(),
        error_reason=None,
        is_disposable=is_disp
    )
