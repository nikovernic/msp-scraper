"""
Robots.txt compliance checker.
Ensures scraping respects website robots.txt directives.
"""

from urllib.robotparser import RobotFileParser
from urllib.parse import urlparse
from typing import Dict, Optional

from src.config.logging_config import logger
from src.config.settings import settings


class RobotsChecker:
    """
    Check and respect robots.txt files.
    Caches parsers to avoid repeated fetches.
    """

    def __init__(self):
        """Initialize robots checker with empty cache."""
        self.parsers: Dict[str, RobotFileParser] = {}
        self.enabled = settings.RESPECT_ROBOTS_TXT
        logger.debug(f"RobotsChecker initialized (enabled: {self.enabled})")

    def can_fetch(self, url: str, user_agent: str = '*') -> bool:
        """
        Check if URL can be fetched according to robots.txt.

        Args:
            url: URL to check
            user_agent: User agent string (default: '*' for any)

        Returns:
            True if allowed to fetch, False otherwise
        """
        if not self.enabled:
            logger.debug("Robots.txt checking disabled, allowing all URLs")
            return True

        try:
            parsed = urlparse(url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"

            # Get or load parser for this domain
            if base_url not in self.parsers:
                self.parsers[base_url] = self._load_robots(base_url)

            parser = self.parsers[base_url]
            allowed = parser.can_fetch(user_agent, url)

            if not allowed:
                logger.warning(f"Blocked by robots.txt: {url}")
            else:
                logger.debug(f"Allowed by robots.txt: {url}")

            return allowed

        except Exception as e:
            # If we can't check robots.txt, log warning and allow by default
            logger.warning(f"Error checking robots.txt for {url}: {e}")
            return True

    def _load_robots(self, base_url: str) -> RobotFileParser:
        """
        Load robots.txt for a domain.

        Args:
            base_url: Base URL of the domain

        Returns:
            RobotFileParser instance
        """
        parser = RobotFileParser()
        robots_url = f"{base_url}/robots.txt"
        parser.set_url(robots_url)

        try:
            logger.debug(f"Loading robots.txt from {robots_url}")
            parser.read()
            logger.info(f"Loaded robots.txt for {base_url}")

        except Exception as e:
            # If robots.txt doesn't exist or fails to load, allow by default
            logger.warning(
                f"Could not load robots.txt for {base_url}: {e}. "
                f"Assuming all URLs are allowed."
            )

        return parser

    def get_crawl_delay(self, url: str, user_agent: str = '*') -> Optional[float]:
        """
        Get crawl delay specified in robots.txt.

        Args:
            url: URL to check
            user_agent: User agent string

        Returns:
            Crawl delay in seconds, or None if not specified
        """
        if not self.enabled:
            return None

        try:
            parsed = urlparse(url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"

            if base_url not in self.parsers:
                self.parsers[base_url] = self._load_robots(base_url)

            parser = self.parsers[base_url]
            delay = parser.crawl_delay(user_agent)

            if delay:
                logger.debug(f"Crawl delay for {base_url}: {delay}s")

            return delay

        except Exception as e:
            logger.warning(f"Error getting crawl delay for {url}: {e}")
            return None

    def clear_cache(self):
        """Clear cached robots.txt parsers."""
        self.parsers.clear()
        logger.debug("Robots.txt cache cleared")

    def get_cached_domains(self) -> list:
        """
        Get list of domains with cached robots.txt.

        Returns:
            List of base URLs
        """
        return list(self.parsers.keys())
