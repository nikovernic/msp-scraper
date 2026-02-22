"""
Logging configuration using Loguru.
Sets up console and file logging with rotation.
"""

import sys
from pathlib import Path
from loguru import logger

from src.config.settings import settings


def setup_logging():
    """
    Configure logging for the application.
    Uses Loguru for better log management and formatting.
    """

    # Remove default handler
    logger.remove()

    # Ensure log directory exists
    settings.LOG_DIR.mkdir(parents=True, exist_ok=True)

    # ============================================
    # Console Handler (stdout)
    # ============================================
    # Format: colorized, with time, level, module, function, and message
    console_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )

    logger.add(
        sys.stdout,
        format=console_format,
        level=settings.LOG_LEVEL,
        colorize=True,
    )

    # ============================================
    # File Handler - General Log
    # ============================================
    # Daily rotation, compressed, kept for 30 days
    file_format = (
        "{time:YYYY-MM-DD HH:mm:ss} | "
        "{level: <8} | "
        "{name}:{function}:{line} - "
        "{message}"
    )

    logger.add(
        settings.LOG_FILE,
        format=file_format,
        level="DEBUG",  # Capture all levels in file
        rotation=settings.LOG_ROTATION,
        retention=settings.LOG_RETENTION,
        compression=settings.LOG_COMPRESSION,
        enqueue=True,  # Async logging
    )

    # ============================================
    # File Handler - Error Log
    # ============================================
    # Separate file for errors only, kept longer
    error_log_file = settings.LOG_DIR / "errors_{time:YYYY-MM-DD}.log"

    logger.add(
        error_log_file,
        format=file_format,
        level="ERROR",
        rotation="1 day",
        retention="90 days",  # Keep errors longer
        compression=settings.LOG_COMPRESSION,
        enqueue=True,
    )

    # ============================================
    # File Handler - Scraping Activity Log
    # ============================================
    # Dedicated log for scraping operations
    scraping_log_file = settings.LOG_DIR / "scraping_{time:YYYY-MM-DD}.log"

    logger.add(
        scraping_log_file,
        format=file_format,
        level="INFO",
        rotation="1 day",
        retention="30 days",
        compression=settings.LOG_COMPRESSION,
        filter=lambda record: "scraper" in record["name"].lower()
               or "scraping" in record["message"].lower(),
        enqueue=True,
    )

    logger.info("Logging initialized")
    logger.debug(f"Log level: {settings.LOG_LEVEL}")
    logger.debug(f"Log file: {settings.LOG_FILE}")

    return logger


# Initialize logging when module is imported
setup_logging()


# Export logger for use in other modules
__all__ = ['logger', 'setup_logging']
