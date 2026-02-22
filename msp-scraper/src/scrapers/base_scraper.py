"""
Abstract base class for all scrapers.
Enforces compliance, rate limiting, and common functionality.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
import time

from src.config.logging_config import logger
from src.config.constants import MIN_EMPLOYEES, MAX_EMPLOYEES
from src.utils.http_client import RateLimitedHttpClient
from src.utils.robots_checker import RobotsChecker


class BaseScraper(ABC):
    """
    Abstract base class for all scrapers.
    Provides common functionality and enforces interface.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize base scraper.

        Args:
            config: Optional configuration dictionary
        """
        self.config = config or {}
        self.logger = logger

        # Initialize HTTP client with rate limiting
        self.http_client = RateLimitedHttpClient(
            requests_per_minute=self.config.get('rate_limit'),
            timeout=self.config.get('timeout'),
        )

        # Initialize robots.txt checker
        self.robots_checker = RobotsChecker()

        # Statistics
        self.stats = {
            'requests': 0,
            'successes': 0,
            'failures': 0,
            'businesses_found': 0,
            'businesses_filtered': 0,
        }

        self.logger.info(
            f"{self.__class__.__name__} initialized "
            f"(rate limit: {self.http_client.requests_per_minute} req/min)"
        )

    @abstractmethod
    def scrape(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Main scraping method - must be implemented by subclasses.

        Args:
            params: Scraping parameters (locations, search terms, etc.)

        Returns:
            List of business data dictionaries
        """
        pass

    def can_scrape_url(self, url: str) -> bool:
        """
        Check if URL can be scraped per robots.txt.

        Args:
            url: URL to check

        Returns:
            True if allowed, False otherwise
        """
        user_agent = self.config.get('user_agent', '*')
        return self.robots_checker.can_fetch(url, user_agent=user_agent)

    def fetch_page(
        self,
        url: str,
        method: str = 'GET',
        **kwargs
    ) -> Optional[str]:
        """
        Fetch page with rate limiting and error handling.

        Args:
            url: URL to fetch
            method: HTTP method (GET or POST)
            **kwargs: Additional arguments for HTTP request

        Returns:
            Page HTML content or None on failure
        """
        if not self.can_scrape_url(url):
            self.logger.warning(f"Blocked by robots.txt: {url}")
            return None

        try:
            self.stats['requests'] += 1

            if method.upper() == 'GET':
                response = self.http_client.get(url, **kwargs)
            elif method.upper() == 'POST':
                response = self.http_client.post(url, **kwargs)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            self.stats['successes'] += 1
            return response.text

        except Exception as e:
            self.logger.error(f"Failed to fetch {url}: {e}")
            self.stats['failures'] += 1
            return None

    def filter_by_employee_count(self, business_data: Dict[str, Any]) -> bool:
        """
        Filter businesses by employee count (3-50).

        Args:
            business_data: Business data dictionary

        Returns:
            True if passes filter, False otherwise
        """
        employee_count = business_data.get('employee_count')

        if employee_count is None:
            # Unknown employee count - keep it (will filter later if needed)
            return True

        # Check if in target range
        in_range = MIN_EMPLOYEES <= employee_count <= MAX_EMPLOYEES

        if not in_range:
            self.stats['businesses_filtered'] += 1
            self.logger.debug(
                f"Filtered out {business_data.get('name')} "
                f"({employee_count} employees)"
            )

        return in_range

    def get_stats(self) -> Dict[str, Any]:
        """
        Get scraper statistics.

        Returns:
            Dictionary with scraping statistics
        """
        return {
            **self.stats,
            'http_stats': self.http_client.get_stats(),
        }

    def reset_stats(self):
        """Reset statistics counters."""
        self.stats = {
            'requests': 0,
            'successes': 0,
            'failures': 0,
            'businesses_found': 0,
            'businesses_filtered': 0,
        }
        self.http_client.reset_stats()
        self.logger.debug(f"{self.__class__.__name__} stats reset")

    def close(self):
        """Clean up resources."""
        self.http_client.close()
        self.logger.debug(f"{self.__class__.__name__} closed")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
