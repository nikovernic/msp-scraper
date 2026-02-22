"""
Yelp scraper using official Yelp Fusion API.
This is the recommended approach (NOT web scraping which violates ToS).
"""

import time
import random
from typing import List, Dict, Any, Optional

from src.scrapers.base_scraper import BaseScraper
from src.config.settings import settings
from src.config.constants import MSP_SEARCH_TERMS


class YelpScraper(BaseScraper):
    """
    Scrapes Yelp using the official Fusion API.
    API documentation: https://www.yelp.com/developers/documentation/v3
    """

    BASE_URL = "https://api.yelp.com/v3"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize Yelp API scraper.

        Args:
            config: Optional configuration dictionary
        """
        super().__init__(config)

        self.api_key = self.config.get('api_key') or settings.YELP_API_KEY
        self.use_api = self.config.get('use_api', True) and settings.YELP_USE_API

        if self.use_api and not self.api_key:
            raise ValueError(
                "Yelp API key is required when use_api=True. "
                "Set YELP_API_KEY in .env file or pass api_key in config. "
                "Get your key at: https://www.yelp.com/developers/v3/manage_app"
            )

        # Yelp API allows much higher rate limits than web scraping
        if self.use_api:
            self.http_client.requests_per_minute = 120  # Conservative rate

        self.logger.info(
            f"YelpScraper initialized (API mode: {self.use_api})"
        )

    def scrape(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Scrape Yelp for MSP businesses.

        Args:
            params: Scraping parameters
                - locations: List of location strings (e.g., ["New York, NY"])
                - search_term: Search term (default: "managed service provider")
                - max_results_per_location: Max results per location (default: 50)
                - radius: Search radius in meters (max: 40000)

        Returns:
            List of business data dictionaries
        """
        if not self.use_api:
            self.logger.error("Yelp web scraping not supported. Use API instead.")
            return []

        locations = params.get('locations', [])
        search_term = params.get('search_term', MSP_SEARCH_TERMS[0])
        max_results = params.get('max_results_per_location', 50)

        all_businesses = []

        for location in locations:
            self.logger.info(f"Searching Yelp in {location}...")

            businesses = self._search_location(
                location=location,
                search_term=search_term,
                max_results=max_results
            )

            all_businesses.extend(businesses)

            # Small delay between locations
            time.sleep(random.uniform(0.5, 1.0))

        self.stats['businesses_found'] = len(all_businesses)
        self.logger.info(
            f"Yelp scrape complete: {len(all_businesses)} businesses found"
        )

        return all_businesses

    def _search_location(
        self,
        location: str,
        search_term: str,
        max_results: int
    ) -> List[Dict[str, Any]]:
        """
        Search Yelp API for businesses in a specific location.

        Args:
            location: Location string
            search_term: Search term
            max_results: Maximum results to return

        Returns:
            List of business data dictionaries
        """
        businesses = []
        offset = 0
        limit = 50  # Yelp API limit per request

        while offset < max_results and offset < 1000:  # Yelp max offset
            results = self._make_api_request(
                term=search_term,
                location=location,
                limit=min(limit, max_results - offset),
                offset=offset
            )

            if not results:
                break

            batch = results.get('businesses', [])
            if not batch:
                break

            # Parse and filter businesses
            for business_data in batch:
                parsed = self._parse_api_business(business_data)

                # Filter by employee count if available
                if self.filter_by_employee_count(parsed):
                    businesses.append(parsed)

            offset += limit

            # Small delay between API requests
            time.sleep(random.uniform(0.3, 0.6))

        self.logger.info(
            f"Found {len(businesses)} MSP businesses in {location}"
        )

        return businesses

    def _make_api_request(
        self,
        term: str,
        location: str,
        limit: int = 50,
        offset: int = 0,
        radius: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Make request to Yelp Fusion API.

        Args:
            term: Search term
            location: Location string
            limit: Results per page (max 50)
            offset: Pagination offset (max 1000)
            radius: Search radius in meters (max 40000)

        Returns:
            API response dictionary or None on failure
        """
        url = f"{self.BASE_URL}/businesses/search"

        headers = {
            'Authorization': f'Bearer {self.api_key}',
        }

        params = {
            'term': term,
            'location': location,
            'limit': limit,
            'offset': offset,
        }

        if radius:
            params['radius'] = min(radius, 40000)  # Yelp max

        try:
            self.stats['requests'] += 1
            response = self.http_client.get(url, headers=headers, params=params)

            self.stats['successes'] += 1
            return response.json()

        except Exception as e:
            self.logger.error(f"Yelp API request failed: {e}")
            self.stats['failures'] += 1
            return None

    def _parse_api_business(self, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Yelp API response into standardized format.

        Args:
            business_data: Raw business data from API

        Returns:
            Standardized business dictionary
        """
        location = business_data.get('location', {})

        # Extract address
        address_parts = location.get('display_address', [])
        address_line1 = address_parts[0] if len(address_parts) > 0 else None
        address_line2 = address_parts[1] if len(address_parts) > 1 else None

        # Note: Yelp API doesn't provide employee count
        # We'll need to get this from other sources

        return {
            'name': business_data.get('name'),
            'business_type': ', '.join(
                [cat['title'] for cat in business_data.get('categories', [])]
            ),
            'website': business_data.get('url'),  # This is Yelp URL, not business website
            'phone': business_data.get('phone'),
            'address_line1': address_line1,
            'address_line2': address_line2,
            'city': location.get('city'),
            'state_province': location.get('state'),
            'postal_code': location.get('zip_code'),
            'country': location.get('country', 'US'),
            'employee_count': None,  # Not available from Yelp API
            'employee_count_source': None,
            'source': 'yelp_api',
            'source_id': business_data.get('id'),
            'source_url': business_data.get('url'),
            'data_quality_score': None,  # Will be calculated later
            # Store raw data for reference
            'raw_data': {
                'rating': business_data.get('rating'),
                'review_count': business_data.get('review_count'),
                'coordinates': business_data.get('coordinates'),
                'price': business_data.get('price'),
            }
        }

    def get_business_details(self, business_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information for a specific business.
        Uses Yelp's Business Details endpoint.

        Args:
            business_id: Yelp business ID

        Returns:
            Detailed business data or None on failure
        """
        url = f"{self.BASE_URL}/businesses/{business_id}"

        headers = {
            'Authorization': f'Bearer {self.api_key}',
        }

        try:
            response = self.http_client.get(url, headers=headers)
            return response.json()

        except Exception as e:
            self.logger.error(
                f"Failed to get details for business {business_id}: {e}"
            )
            return None
