"""
Data validation and normalization utilities.
"""

import re
import phonenumbers
from typing import Optional
from urllib.parse import urlparse

from src.config.constants import EMAIL_PATTERN, PHONE_PATTERN


def normalize_phone(phone: str) -> Optional[str]:
    """
    Normalize phone number to E.164 format.

    Args:
        phone: Raw phone number string

    Returns:
        Normalized phone number or None if invalid
    """
    if not phone:
        return None

    try:
        # Try to parse as US/Canada number first
        parsed = phonenumbers.parse(phone, "US")

        if phonenumbers.is_valid_number(parsed):
            # Format as E.164 (international format)
            return phonenumbers.format_number(
                parsed,
                phonenumbers.PhoneNumberFormat.E164
            )
    except phonenumbers.NumberParseException:
        pass

    # If parsing fails, try basic cleanup
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)

    if len(digits) == 10:
        # Assume US/Canada number, add country code
        return f"+1{digits}"
    elif len(digits) == 11 and digits[0] == '1':
        # Already has country code
        return f"+{digits}"

    # Can't normalize, return original
    return phone


def normalize_url(url: str) -> Optional[str]:
    """
    Normalize URL to consistent format.

    Args:
        url: Raw URL string

    Returns:
        Normalized URL or None if invalid
    """
    if not url:
        return None

    # Add scheme if missing
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'

    try:
        parsed = urlparse(url)

        # Rebuild URL with lowercase scheme and domain
        normalized = f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"

        # Add path if present
        if parsed.path and parsed.path != '/':
            normalized += parsed.path

        # Remove trailing slash
        if normalized.endswith('/'):
            normalized = normalized[:-1]

        return normalized

    except Exception:
        return None


def validate_email(email: str) -> bool:
    """
    Validate email address format.

    Args:
        email: Email address string

    Returns:
        True if valid format, False otherwise
    """
    if not email:
        return False

    return bool(EMAIL_PATTERN.match(email.strip()))


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format.

    Args:
        phone: Phone number string

    Returns:
        True if valid format, False otherwise
    """
    if not phone:
        return False

    try:
        parsed = phonenumbers.parse(phone, "US")
        return phonenumbers.is_valid_number(parsed)
    except phonenumbers.NumberParseException:
        # Try basic pattern matching
        return bool(PHONE_PATTERN.match(phone))


def validate_url(url: str) -> bool:
    """
    Validate URL format.

    Args:
        url: URL string

    Returns:
        True if valid format, False otherwise
    """
    if not url:
        return False

    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def clean_text(text: str) -> str:
    """
    Clean and normalize text.

    Args:
        text: Raw text string

    Returns:
        Cleaned text
    """
    if not text:
        return ""

    # Strip whitespace
    text = text.strip()

    # Replace multiple whitespace with single space
    text = re.sub(r'\s+', ' ', text)

    # Remove zero-width characters
    text = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', text)

    return text


def extract_domain(url: str) -> Optional[str]:
    """
    Extract domain from URL.

    Args:
        url: URL string

    Returns:
        Domain name or None if invalid
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc

        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]

        return domain.lower()

    except Exception:
        return None
