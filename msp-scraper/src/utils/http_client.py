"""
Rate-limited HTTP client with retry logic and error handling.
"""

import time
import random
from typing import Optional, Dict, Any
from requests import Session, Response
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.config.logging_config import logger
from src.config.settings import settings
from src.config.constants import USER_AGENTS


class RateLimitedHttpClient:
    """
    HTTP client with built-in rate limiting and retry logic.
    Prevents overwhelming servers and handles transient failures gracefully.
    """

    def __init__(
        self,
        requests_per_minute: Optional[int] = None,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None,
    ):
        """
        Initialize HTTP client.

        Args:
            requests_per_minute: Max requests per minute (default from settings)
            timeout: Request timeout in seconds (default from settings)
            max_retries: Max retry attempts (default from settings)
        """
        self.requests_per_minute = requests_per_minute or settings.RATE_LIMIT_RPM
        self.timeout = timeout or settings.REQUEST_TIMEOUT
        self.max_retries = max_retries or settings.MAX_RETRIES

        # Calculate minimum delay between requests
        self.min_delay = 60.0 / self.requests_per_minute
        self.last_request_time = 0

        # Setup session with retry logic
        self.session = Session()

        # Configure retry strategy
        retry_strategy = Retry(
            total=self.max_retries,
            backoff_factor=settings.RETRY_BACKOFF_FACTOR,
            status_forcelist=[429, 500, 502, 503, 504],  # Retry on these HTTP codes
            allowed_methods=["GET", "POST"],  # Only retry safe methods
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Statistics
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_wait_time': 0,
        }

        logger.debug(
            f"HTTP client initialized: {self.requests_per_minute} req/min, "
            f"{self.timeout}s timeout, {self.max_retries} retries"
        )

    def get(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Response:
        """
        Make GET request with rate limiting.

        Args:
            url: URL to fetch
            headers: Optional custom headers
            params: Optional query parameters
            **kwargs: Additional arguments passed to requests.get()

        Returns:
            Response object

        Raises:
            requests.RequestException: On request failure
        """
        return self._make_request('GET', url, headers=headers, params=params, **kwargs)

    def post(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Response:
        """
        Make POST request with rate limiting.

        Args:
            url: URL to post to
            headers: Optional custom headers
            data: Optional form data
            json: Optional JSON data
            **kwargs: Additional arguments passed to requests.post()

        Returns:
            Response object

        Raises:
            requests.RequestException: On request failure
        """
        return self._make_request(
            'POST',
            url,
            headers=headers,
            data=data,
            json=json,
            **kwargs
        )

    def _make_request(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> Response:
        """
        Internal method to make HTTP requests with rate limiting.

        Args:
            method: HTTP method (GET, POST, etc.)
            url: URL to request
            **kwargs: Additional arguments for request

        Returns:
            Response object
        """
        # Wait if needed to respect rate limit
        wait_time = self._wait_if_needed()
        if wait_time > 0:
            self.stats['total_wait_time'] += wait_time

        # Prepare headers with rotating user agent
        headers = kwargs.get('headers', {})
        if 'User-Agent' not in headers:
            headers['User-Agent'] = self._get_user_agent()
        kwargs['headers'] = headers

        # Set timeout if not provided
        if 'timeout' not in kwargs:
            kwargs['timeout'] = self.timeout

        # Make request
        self.stats['total_requests'] += 1
        start_time = time.time()

        try:
            logger.debug(f"{method} {url}")
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()

            self.stats['successful_requests'] += 1
            elapsed = time.time() - start_time
            logger.debug(f"Request successful ({response.status_code}) in {elapsed:.2f}s")

            return response

        except Exception as e:
            self.stats['failed_requests'] += 1
            elapsed = time.time() - start_time
            logger.error(f"Request failed after {elapsed:.2f}s: {e}")
            raise

        finally:
            self.last_request_time = time.time()

    def _wait_if_needed(self) -> float:
        """
        Enforce rate limit by waiting if needed.

        Returns:
            Time waited in seconds
        """
        if self.last_request_time == 0:
            return 0

        elapsed = time.time() - self.last_request_time

        if elapsed < self.min_delay:
            # Need to wait
            sleep_time = self.min_delay - elapsed

            # Add random jitter to avoid thundering herd
            jitter = random.uniform(0, 0.5)
            total_sleep = sleep_time + jitter

            logger.debug(f"Rate limiting: waiting {total_sleep:.2f}s")
            time.sleep(total_sleep)

            return total_sleep

        return 0

    def _get_user_agent(self) -> str:
        """
        Get user agent for request.
        Rotates through different user agents to appear more natural.

        Returns:
            User agent string
        """
        if settings.USER_AGENT and settings.USER_AGENT != USER_AGENTS[0]:
            # Use custom user agent from settings
            return settings.USER_AGENT

        # Rotate through predefined user agents
        return random.choice(USER_AGENTS)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get client statistics.

        Returns:
            Dictionary with request statistics
        """
        success_rate = 0
        if self.stats['total_requests'] > 0:
            success_rate = (
                self.stats['successful_requests'] / self.stats['total_requests']
            ) * 100

        return {
            **self.stats,
            'success_rate': f"{success_rate:.1f}%",
            'avg_wait_time': (
                self.stats['total_wait_time'] / self.stats['total_requests']
                if self.stats['total_requests'] > 0
                else 0
            ),
        }

    def reset_stats(self):
        """Reset statistics counters."""
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_wait_time': 0,
        }
        logger.debug("HTTP client stats reset")

    def close(self):
        """Close the session."""
        self.session.close()
        logger.debug("HTTP client session closed")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
