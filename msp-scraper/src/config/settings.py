"""
Application configuration management.
Loads settings from environment variables using python-dotenv.
"""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)


class Settings:
    """
    Centralized configuration from environment variables.
    All settings are loaded from .env file or environment.
    """

    # ============================================
    # Environment
    # ============================================
    ENV: str = os.getenv('ENV', 'development')
    DEBUG: bool = os.getenv('DEBUG', 'false').lower() == 'true'

    # ============================================
    # Project Paths
    # ============================================
    BASE_DIR: Path = Path(__file__).parent.parent.parent
    DATA_DIR: Path = BASE_DIR / 'data'
    DATABASE_DIR: Path = DATA_DIR / 'databases'
    EXPORT_DIR: Path = Path(os.getenv('EXPORT_DIR', str(DATA_DIR / 'exports')))
    LOG_DIR: Path = DATA_DIR / 'logs'
    CACHE_DIR: Path = DATA_DIR / 'cache'

    # ============================================
    # Database Configuration
    # ============================================
    DATABASE_URL: str = os.getenv(
        'DATABASE_URL',
        f'sqlite:///{DATABASE_DIR}/msp_scraper.db'
    )

    # SQLAlchemy configuration
    SQLALCHEMY_ECHO: bool = DEBUG
    SQLALCHEMY_POOL_SIZE: int = int(os.getenv('SQLALCHEMY_POOL_SIZE', '5'))
    SQLALCHEMY_MAX_OVERFLOW: int = int(os.getenv('SQLALCHEMY_MAX_OVERFLOW', '10'))

    # ============================================
    # Scraping Configuration
    # ============================================
    RATE_LIMIT_RPM: int = int(os.getenv('RATE_LIMIT_RPM', '10'))
    USER_AGENT: str = os.getenv(
        'USER_AGENT',
        'Mozilla/5.0 (compatible; MSPScraper/1.0; +https://yoursite.com/bot)'
    )
    RESPECT_ROBOTS_TXT: bool = os.getenv('RESPECT_ROBOTS_TXT', 'true').lower() == 'true'
    REQUEST_TIMEOUT: int = int(os.getenv('REQUEST_TIMEOUT', '30'))

    # Retry configuration
    MAX_RETRIES: int = int(os.getenv('MAX_RETRIES', '3'))
    RETRY_BACKOFF_FACTOR: float = float(os.getenv('RETRY_BACKOFF_FACTOR', '2.0'))

    # ============================================
    # API Keys
    # ============================================
    YELP_API_KEY: str = os.getenv('YELP_API_KEY', '')
    YELP_USE_API: bool = os.getenv('YELP_USE_API', 'true').lower() == 'true'

    # Google Places API
    # Get your key at: https://console.cloud.google.com/apis/credentials
    GOOGLE_PLACES_API_KEY: str = os.getenv('GOOGLE_PLACES_API_KEY', '')

    # ============================================
    # Proxy Configuration
    # ============================================
    USE_PROXIES: bool = os.getenv('USE_PROXIES', 'false').lower() == 'true'
    PROXY_LIST: List[str] = [
        p.strip() for p in os.getenv('PROXY_LIST', '').split(',')
        if p.strip()
    ]

    # ============================================
    # Logging Configuration
    # ============================================
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE: Path = Path(os.getenv('LOG_FILE', str(LOG_DIR / 'scraper.log')))
    LOG_ROTATION: str = os.getenv('LOG_ROTATION', '1 day')
    LOG_RETENTION: str = os.getenv('LOG_RETENTION', '30 days')
    LOG_COMPRESSION: str = os.getenv('LOG_COMPRESSION', 'zip')

    # ============================================
    # Scheduling Configuration
    # ============================================
    ENABLE_SCHEDULING: bool = os.getenv('ENABLE_SCHEDULING', 'false').lower() == 'true'
    FULL_SCRAPE_SCHEDULE: str = os.getenv('FULL_SCRAPE_SCHEDULE', '0 2 * * 0')
    INCREMENTAL_SCRAPE_SCHEDULE: str = os.getenv('INCREMENTAL_SCRAPE_SCHEDULE', '0 2 * * 1-6')

    # ============================================
    # Email Notifications
    # ============================================
    ENABLE_EMAIL_NOTIFICATIONS: bool = os.getenv('ENABLE_EMAIL_NOTIFICATIONS', 'false').lower() == 'true'
    SMTP_HOST: str = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT: int = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER: str = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD: str = os.getenv('SMTP_PASSWORD', '')
    NOTIFICATION_EMAIL: str = os.getenv('NOTIFICATION_EMAIL', '')

    @classmethod
    def ensure_directories(cls):
        """Ensure all required directories exist."""
        for directory in [cls.DATA_DIR, cls.DATABASE_DIR, cls.EXPORT_DIR,
                         cls.LOG_DIR, cls.CACHE_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    @classmethod
    def validate(cls):
        """
        Validate required settings.
        Raises ValueError if critical settings are missing.
        """
        # Ensure directories exist
        cls.ensure_directories()

        # Validate Yelp API if enabled
        if cls.YELP_USE_API and not cls.YELP_API_KEY:
            raise ValueError(
                "YELP_API_KEY is required when YELP_USE_API=true. "
                "Get your key at: https://www.yelp.com/developers/v3/manage_app"
            )

        # Validate email settings if enabled
        if cls.ENABLE_EMAIL_NOTIFICATIONS:
            if not all([cls.SMTP_USER, cls.SMTP_PASSWORD, cls.NOTIFICATION_EMAIL]):
                raise ValueError(
                    "SMTP_USER, SMTP_PASSWORD, and NOTIFICATION_EMAIL are required "
                    "when ENABLE_EMAIL_NOTIFICATIONS=true"
                )

        # Validate rate limiting
        if cls.RATE_LIMIT_RPM < 1:
            raise ValueError("RATE_LIMIT_RPM must be at least 1")

        return True

    @classmethod
    def get_database_url(cls, for_alembic: bool = False) -> str:
        """
        Get database URL, optionally formatted for Alembic.

        Args:
            for_alembic: If True, format URL for Alembic migrations

        Returns:
            Database URL string
        """
        url = cls.DATABASE_URL

        # SQLite URL needs to be absolute for Alembic
        if for_alembic and url.startswith('sqlite:///'):
            path = url.replace('sqlite:///', '')
            if not path.startswith('/'):
                # Convert relative to absolute
                absolute_path = (cls.BASE_DIR / path).absolute()
                url = f'sqlite:///{absolute_path}'

        return url


# Create singleton instance
settings = Settings()

# Validate settings on import
settings.validate()
