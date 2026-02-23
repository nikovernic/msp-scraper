"""
Google Places scraper using the official Places API (Text Search).
Businesses self-categorize more accurately than Yelp and returns actual website URLs.
"""

import time
import random
from typing import List, Dict, Any, Optional

from src.scrapers.base_scraper import BaseScraper
from src.config.settings import settings
from src.config.constants import (
    GOOGLE_PLACES_SEARCH_TERMS,
    DEFAULT_RATE_LIMITS,
    DEFAULT_TIMEOUTS,
    SOURCE_GOOGLE_PLACES,
)


class GooglePlacesScraper(BaseScraper):
    """
    Scrapes MSP businesses via the Google Places API (Text Search).
    Uses the official API — no web scraping needed.
    $200/month free credit covers ~5,000 requests.
    """

    BASE_URL = "https://maps.googleapis.com/maps/api/place"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        config = config or {}
        config.setdefault('rate_limit', DEFAULT_RATE_LIMITS.get('google_places', 60))
        config.setdefault('timeout', DEFAULT_TIMEOUTS.get('google_places', 15))
        super().__init__(config)

        self.api_key = self.config.get('api_key') or settings.GOOGLE_PLACES_API_KEY
        if not self.api_key:
            raise ValueError(
                "Google Places API key is required. "
                "Set GOOGLE_PLACES_API_KEY in .env file or pass api_key in config. "
                "Get your key at: https://console.cloud.google.com/apis/credentials"
            )

        self.logger.info("GooglePlacesScraper initialized")

    def scrape(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search Google Places for MSP businesses.

        Args:
            params: Scraping parameters
                - locations: List of location strings (e.g., ["New York, NY"])
                - search_terms: List of search terms (default: GOOGLE_PLACES_SEARCH_TERMS)
                - max_results_per_location: Max results per location (default: 60)

        Returns:
            List of business data dictionaries
        """
        locations = params.get('locations', [])
        search_terms = params.get('search_terms', GOOGLE_PLACES_SEARCH_TERMS[:2])
        max_results = params.get('max_results_per_location', 60)

        all_businesses = []
        seen_place_ids = set()

        for location in locations:
            for term in search_terms:
                query = f"{term} in {location}"
                self.logger.info(f"Searching Google Places: '{query}'")

                businesses = self._text_search(query, max_results)

                # Deduplicate by place_id within this scrape
                for biz in businesses:
                    place_id = biz.get('source_id')
                    if place_id and place_id not in seen_place_ids:
                        seen_place_ids.add(place_id)
                        all_businesses.append(biz)

                time.sleep(random.uniform(0.3, 0.8))

        # Auto-enrich with Place Details to get website/phone
        # (Text Search doesn't return these, and the data processor
        # requires at least one contact method)
        self.logger.info(
            f"Enriching {len(all_businesses)} businesses with Place Details..."
        )
        all_businesses = self.enrich_with_details(all_businesses, max_details=len(all_businesses))

        self.stats['businesses_found'] = len(all_businesses)
        self.logger.info(
            f"Google Places scrape complete: {len(all_businesses)} businesses found"
        )

        return all_businesses

    def _text_search(
        self, query: str, max_results: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Perform a Text Search request.

        Args:
            query: Search query string
            max_results: Maximum number of results

        Returns:
            List of parsed business dicts
        """
        businesses = []
        next_page_token = None

        while len(businesses) < max_results:
            results = self._make_api_request(
                query=query,
                page_token=next_page_token,
            )

            if not results:
                break

            for place in results.get('results', []):
                parsed = self._parse_place(place)
                if parsed and self.filter_by_employee_count(parsed):
                    businesses.append(parsed)

            next_page_token = results.get('next_page_token')
            if not next_page_token:
                break

            # Google requires a short delay before using next_page_token
            time.sleep(2.0)

        return businesses[:max_results]

    def _make_api_request(
        self,
        query: str,
        page_token: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Make request to Google Places Text Search API.

        Args:
            query: Search query
            page_token: Token for next page of results

        Returns:
            API response dict or None on failure
        """
        url = f"{self.BASE_URL}/textsearch/json"

        params = {
            'query': query,
            'key': self.api_key,
        }

        if page_token:
            params['pagetoken'] = page_token

        try:
            self.stats['requests'] += 1
            response = self.http_client.get(url, params=params)
            data = response.json()

            status = data.get('status')
            if status == 'OK' or status == 'ZERO_RESULTS':
                self.stats['successes'] += 1
                return data
            elif status == 'OVER_QUERY_LIMIT':
                self.logger.warning("Google Places API quota exceeded")
                self.stats['failures'] += 1
                return None
            elif status == 'REQUEST_DENIED':
                self.logger.error(
                    f"Google Places API request denied: "
                    f"{data.get('error_message', 'Unknown error')}"
                )
                self.stats['failures'] += 1
                return None
            else:
                self.logger.warning(f"Google Places API status: {status}")
                self.stats['failures'] += 1
                return None

        except Exception as e:
            self.logger.error(f"Google Places API request failed: {e}")
            self.stats['failures'] += 1
            return None

    def _parse_place(self, place_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse Google Places result into standardized format.

        Args:
            place_data: Raw place data from API

        Returns:
            Standardized business dict or None
        """
        name = place_data.get('name')
        if not name:
            return None

        # Parse address components from formatted_address
        address = place_data.get('formatted_address', '')
        city, state, postal_code, country = self._parse_address(address)

        # Extract business types
        types = place_data.get('types', [])
        business_type = ', '.join(
            t.replace('_', ' ').title() for t in types
            if t not in ('point_of_interest', 'establishment')
        )

        place_id = place_data.get('place_id')

        return {
            'name': name,
            'business_type': business_type or 'IT Services',
            'website': None,  # Requires Place Details call
            'phone': None,  # Requires Place Details call
            'address_line1': address.split(',')[0].strip() if address else None,
            'address_line2': None,
            'city': city,
            'state_province': state,
            'postal_code': postal_code,
            'country': country or 'US',
            'employee_count': None,
            'employee_count_source': None,
            'source': SOURCE_GOOGLE_PLACES,
            'source_id': place_id,
            'source_url': None,
            'data_quality_score': None,
            'raw_data': {
                'rating': place_data.get('rating'),
                'user_ratings_total': place_data.get('user_ratings_total'),
                'business_status': place_data.get('business_status'),
                'types': types,
                'formatted_address': address,
                'geometry': place_data.get('geometry', {}).get('location'),
            },
        }

    def _parse_address(self, address: str) -> tuple:
        """
        Parse formatted address into components.
        Google returns: "123 Main St, City, ST 12345, Country"

        Returns:
            (city, state, postal_code, country)
        """
        if not address:
            return None, None, None, None

        import re
        parts = [p.strip() for p in address.split(',')]

        city = None
        state = None
        postal_code = None
        country = None

        if len(parts) >= 3:
            # Typical: "123 Main St, City, ST 12345, USA"
            city = parts[-3].strip() if len(parts) >= 3 else None

            # State + ZIP often in same part
            state_zip = parts[-2].strip() if len(parts) >= 2 else ''
            match = re.match(r'([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?', state_zip)
            if match:
                state = match.group(1)
                postal_code = match.group(2)
            else:
                state = state_zip

            country = parts[-1].strip() if len(parts) >= 1 else None

        elif len(parts) == 2:
            city = parts[0].strip()
            state = parts[1].strip()

        return city, state, postal_code, country

    def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed info for a place (website, phone, etc.).
        Note: Place Details requests cost more API credits.

        Args:
            place_id: Google Place ID

        Returns:
            Place details dict or None
        """
        url = f"{self.BASE_URL}/details/json"

        params = {
            'place_id': place_id,
            'fields': 'name,formatted_phone_number,website,url,formatted_address',
            'key': self.api_key,
        }

        try:
            self.stats['requests'] += 1
            response = self.http_client.get(url, params=params)
            data = response.json()

            if data.get('status') == 'OK':
                self.stats['successes'] += 1
                return data.get('result')

            self.stats['failures'] += 1
            return None

        except Exception as e:
            self.logger.error(f"Place Details request failed: {e}")
            self.stats['failures'] += 1
            return None

    def enrich_with_details(
        self, businesses: List[Dict[str, Any]], max_details: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Enrich businesses with Place Details (website, phone).
        Use sparingly — each call costs additional API credits.

        Args:
            businesses: List of business dicts with source_id (place_id)
            max_details: Max number of detail lookups

        Returns:
            Enriched businesses list
        """
        enriched = 0

        for biz in businesses:
            if enriched >= max_details:
                break

            place_id = biz.get('source_id')
            if not place_id:
                continue

            # Skip if already has website
            if biz.get('website'):
                continue

            details = self.get_place_details(place_id)
            if details:
                biz['website'] = details.get('website')
                biz['phone'] = biz['phone'] or details.get(
                    'formatted_phone_number'
                )
                enriched += 1

            time.sleep(random.uniform(0.2, 0.5))

        self.logger.info(f"Enriched {enriched} businesses with Place Details")
        return businesses
