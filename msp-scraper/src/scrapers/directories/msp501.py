"""
MSP 501 scraper — Channel Futures' curated list of top 501 MSPs.
Simple HTML scraping with BeautifulSoup. Highest quality data source.
"""

import time
import random
from typing import List, Dict, Any, Optional

from bs4 import BeautifulSoup

from src.scrapers.base_scraper import BaseScraper
from src.config.constants import (
    MSP501_BASE_URL,
    MSP501_TIER_RANGES,
    DEFAULT_RATE_LIMITS,
    DEFAULT_TIMEOUTS,
    DELAY_BETWEEN_PAGES,
    SOURCE_MSP501,
)


class MSP501Scraper(BaseScraper):
    """
    Scrapes the Channel Futures MSP 501 ranking list.
    ~501 verified MSPs across 10 tier pages.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        config = config or {}
        config.setdefault('rate_limit', DEFAULT_RATE_LIMITS.get('msp501', 10))
        config.setdefault('timeout', DEFAULT_TIMEOUTS.get('msp501', 30))
        super().__init__(config)

        self.base_url = MSP501_BASE_URL
        self.tier_ranges = MSP501_TIER_RANGES

        self.logger.info("MSP501Scraper initialized")

    def scrape(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Scrape the MSP 501 list.

        Args:
            params: Scraping parameters
                - year: Year of the list (default: 2025)
                - max_pages: Max tier pages to scrape (default: all 10)

        Returns:
            List of business data dictionaries
        """
        year = params.get('year', 2025)
        max_pages = params.get('max_pages', len(self.tier_ranges))
        tiers = self.tier_ranges[:max_pages]

        all_businesses = []

        for i, tier_range in enumerate(tiers):
            url = self._build_tier_url(year, tier_range)
            self.logger.info(
                f"Scraping MSP 501 tier {tier_range} "
                f"(page {i + 1}/{len(tiers)}): {url}"
            )

            businesses = self._scrape_tier_page(url, tier_range)
            all_businesses.extend(businesses)

            # Delay between pages
            if i < len(tiers) - 1:
                delay = random.uniform(*DELAY_BETWEEN_PAGES)
                self.logger.debug(f"Waiting {delay:.1f}s before next page")
                time.sleep(delay)

        self.stats['businesses_found'] = len(all_businesses)
        self.logger.info(
            f"MSP 501 scrape complete: {len(all_businesses)} businesses found"
        )

        return all_businesses

    def _build_tier_url(self, year: int, tier_range: str) -> str:
        """Build URL for a specific tier page."""
        return (
            f"{self.base_url}/"
            f"msp-501-top-managed-service-providers-{year}-{tier_range}"
        )

    def _scrape_tier_page(
        self, url: str, tier_range: str
    ) -> List[Dict[str, Any]]:
        """
        Scrape a single MSP 501 tier page.

        Args:
            url: Tier page URL
            tier_range: Tier range string (e.g., '50-1')

        Returns:
            List of business data dictionaries
        """
        html = self.fetch_page(url)
        if not html:
            self.logger.warning(f"Failed to fetch tier page: {url}")
            return []

        soup = BeautifulSoup(html, 'html.parser')
        businesses = []

        # MSP 501 pages typically use table rows or article cards
        # Try multiple selectors to handle layout variations
        entries = self._extract_entries_table(soup)
        if not entries:
            entries = self._extract_entries_list(soup)
        if not entries:
            entries = self._extract_entries_generic(soup)

        for entry in entries:
            parsed = self._parse_entry(entry, tier_range)
            if parsed and parsed.get('name'):
                if self.filter_by_employee_count(parsed):
                    businesses.append(parsed)

        self.logger.info(
            f"Tier {tier_range}: found {len(businesses)} businesses"
        )

        return businesses

    def _extract_entries_table(self, soup: BeautifulSoup) -> list:
        """Extract entries from table-based layout."""
        entries = []
        table = soup.find('table')
        if not table:
            return entries

        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if cells and len(cells) >= 2:
                entries.append({
                    'type': 'table_row',
                    'cells': cells,
                    'row': row,
                })

        return entries

    def _extract_entries_list(self, soup: BeautifulSoup) -> list:
        """Extract entries from list/card-based layout."""
        entries = []

        # Look for common article/card patterns
        for selector in [
            'article', '.msp-entry', '.ranking-entry',
            '.company-listing', '[class*="rank"]',
            '.list-item', '.entry',
        ]:
            items = soup.select(selector)
            if items:
                for item in items:
                    entries.append({'type': 'card', 'element': item})
                break

        return entries

    def _extract_entries_generic(self, soup: BeautifulSoup) -> list:
        """
        Fallback: extract entries from headings or bold text patterns
        that look like ranked company listings.
        """
        entries = []

        # Look for numbered headings (e.g., "1. CompanyName")
        for heading in soup.find_all(['h2', 'h3', 'h4', 'h5']):
            text = heading.get_text(strip=True)
            if text and (text[0].isdigit() or any(
                c.isdigit() for c in text[:5]
            )):
                entries.append({
                    'type': 'heading',
                    'element': heading,
                    'text': text,
                })

        # If no numbered headings, look for bold/strong text within divs
        if not entries:
            content_area = soup.find('main') or soup.find(
                'div', class_=lambda c: c and 'content' in c.lower()
            ) or soup.find('article') or soup
            for strong in content_area.find_all(['strong', 'b']):
                text = strong.get_text(strip=True)
                if text and len(text) > 2:
                    entries.append({
                        'type': 'strong',
                        'element': strong,
                        'text': text,
                    })

        return entries

    def _parse_entry(
        self, entry: Dict[str, Any], tier_range: str
    ) -> Optional[Dict[str, Any]]:
        """
        Parse a single MSP 501 entry into standardized format.

        Args:
            entry: Raw entry dict from extraction
            tier_range: Tier range for context

        Returns:
            Standardized business dict or None
        """
        name = None
        rank = None
        location = None
        details_text = ''

        if entry['type'] == 'table_row':
            cells = entry['cells']
            cell_texts = [c.get_text(strip=True) for c in cells]

            # Skip header rows
            if cell_texts and cell_texts[0].lower() in (
                'rank', '#', 'number', 'no.', 'no'
            ):
                return None

            # Try to extract rank and name from first cells
            for i, text in enumerate(cell_texts):
                if text.isdigit() and rank is None:
                    rank = int(text)
                elif text and not text.isdigit() and name is None:
                    name = text
                elif name and not location:
                    # Remaining cells might be location or other details
                    if ',' in text:
                        location = text

            details_text = ' | '.join(cell_texts)

        elif entry['type'] == 'card':
            element = entry['element']
            # Look for name in headings within the card
            heading = element.find(['h2', 'h3', 'h4', 'h5', 'a'])
            if heading:
                name = heading.get_text(strip=True)

            # Look for rank
            rank_el = element.find(
                class_=lambda c: c and 'rank' in c.lower()
            ) if element.get('class') else None
            if rank_el:
                rank_text = rank_el.get_text(strip=True)
                rank = self._extract_number(rank_text)

            details_text = element.get_text(strip=True)

        elif entry['type'] in ('heading', 'strong'):
            text = entry.get('text', '')
            # Parse "1. Company Name" or "#1 Company Name" patterns
            rank, name = self._parse_ranked_text(text)

            # Look for location in sibling/parent text
            element = entry['element']
            parent = element.parent
            if parent:
                parent_text = parent.get_text(strip=True)
                details_text = parent_text

        if not name:
            return None

        # Clean up the name
        name = name.strip().strip('#').strip('.')
        # Remove leading rank number if embedded in name
        if name and name[0].isdigit():
            parts = name.split('.', 1)
            if len(parts) == 2 and parts[0].strip().isdigit():
                name = parts[1].strip()
            else:
                parts = name.split(' ', 1)
                if len(parts) == 2 and parts[0].strip().isdigit():
                    name = parts[1].strip()

        if not name or len(name) < 2:
            return None

        # Try to extract location from details
        if not location:
            location = self._extract_location(details_text)

        city, state = self._parse_location(location)

        return {
            'name': name,
            'business_type': 'Managed Service Provider',
            'website': None,
            'phone': None,
            'address_line1': None,
            'address_line2': None,
            'city': city,
            'state_province': state,
            'postal_code': None,
            'country': 'US',
            'employee_count': None,
            'employee_count_source': None,
            'source': SOURCE_MSP501,
            'source_id': f"msp501-rank-{rank}" if rank else None,
            'source_url': None,
            'data_quality_score': None,
            'raw_data': {
                'rank': rank,
                'tier_range': tier_range,
                'location_raw': location,
                'details': details_text[:500] if details_text else None,
            },
        }

    def _extract_number(self, text: str) -> Optional[int]:
        """Extract first number from text."""
        import re
        match = re.search(r'\d+', text)
        return int(match.group()) if match else None

    def _parse_ranked_text(self, text: str) -> tuple:
        """Parse text like '1. Company Name' or '#1 Company Name'."""
        import re

        # "#1 Company Name" or "#1. Company Name"
        match = re.match(r'#?\s*(\d+)[.\s-]+(.+)', text)
        if match:
            return int(match.group(1)), match.group(2).strip()

        return None, text

    def _extract_location(self, text: str) -> Optional[str]:
        """Try to extract a US location (City, ST) from text."""
        import re
        # Match "City, ST" or "City, State" patterns
        match = re.search(
            r'([A-Z][a-zA-Z\s.]+),\s*([A-Z]{2})\b', text
        )
        if match:
            return f"{match.group(1).strip()}, {match.group(2)}"
        return None

    def _parse_location(self, location: Optional[str]) -> tuple:
        """Parse location string into (city, state)."""
        if not location:
            return None, None

        parts = location.split(',')
        city = parts[0].strip() if len(parts) > 0 else None
        state = parts[1].strip() if len(parts) > 1 else None

        return city, state
