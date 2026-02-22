"""
Clutch.co scraper for B2B IT services / MSP directory.
Uses Selenium for JS-rendered pages + BeautifulSoup for parsing.
"""

import time
import random
from typing import List, Dict, Any, Optional
from urllib.parse import urlencode, urljoin

from bs4 import BeautifulSoup

from src.scrapers.base_scraper import BaseScraper
from src.config.constants import (
    CLUTCH_BASE_URL,
    CLUTCH_PROFILE_BASE_URL,
    DEFAULT_RATE_LIMITS,
    DEFAULT_TIMEOUTS,
    DELAY_BETWEEN_PAGES,
    DELAY_BETWEEN_REQUESTS,
    SOURCE_CLUTCH,
)


class ClutchScraper(BaseScraper):
    """
    Scrapes Clutch.co MSP listings.
    Best B2B source — MSP-specific category with employee counts and company details.
    Uses Selenium to render JS-heavy pages, then BeautifulSoup to parse.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        config = config or {}
        config.setdefault('rate_limit', DEFAULT_RATE_LIMITS.get('clutch', 5))
        config.setdefault('timeout', DEFAULT_TIMEOUTS.get('clutch', 45))
        super().__init__(config)

        self.base_url = CLUTCH_BASE_URL
        self.driver = None

        self.logger.info("ClutchScraper initialized")

    def _init_driver(self):
        """Initialize Selenium WebDriver (Chrome headless)."""
        if self.driver:
            return

        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            from selenium.webdriver.chrome.service import Service

            options = Options()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument(
                '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            )
            # Reduce detection
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option('excludeSwitches', ['enable-automation'])

            self.driver = webdriver.Chrome(options=options)
            self.driver.set_page_load_timeout(self.config.get('timeout', 45))

            self.logger.info("Selenium WebDriver initialized (Chrome headless)")

        except ImportError:
            raise ImportError(
                "Selenium is required for Clutch scraping. "
                "Install it with: pip install selenium"
            )
        except Exception as e:
            raise RuntimeError(
                f"Failed to initialize Chrome WebDriver: {e}. "
                "Ensure Chrome and chromedriver are installed."
            )

    def scrape(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Scrape Clutch.co for MSP listings.

        Args:
            params: Scraping parameters
                - locations: List of location strings (e.g., ["New York"])
                - max_pages_per_location: Max listing pages per location (default: 3)
                - fetch_profiles: Whether to follow profile links (default: False)

        Returns:
            List of business data dictionaries
        """
        locations = params.get('locations', [])
        max_pages = params.get('max_pages_per_location', 3)
        fetch_profiles = params.get('fetch_profiles', False)

        self._init_driver()

        all_businesses = []
        seen_urls = set()

        for location in locations:
            self.logger.info(f"Scraping Clutch.co for MSPs in {location}...")

            businesses = self._scrape_location(
                location=location,
                max_pages=max_pages,
            )

            # Deduplicate by source_url
            for biz in businesses:
                url = biz.get('source_url', '')
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_businesses.append(biz)
                elif not url:
                    all_businesses.append(biz)

            time.sleep(random.uniform(*DELAY_BETWEEN_PAGES))

        # Optionally enrich with profile details
        if fetch_profiles:
            all_businesses = self._enrich_profiles(all_businesses)

        self.stats['businesses_found'] = len(all_businesses)
        self.logger.info(
            f"Clutch scrape complete: {len(all_businesses)} businesses found"
        )

        return all_businesses

    def _scrape_location(
        self, location: str, max_pages: int
    ) -> List[Dict[str, Any]]:
        """
        Scrape listing pages for a specific location.

        Args:
            location: Location name for filter
            max_pages: Max pages to scrape

        Returns:
            List of business dicts
        """
        businesses = []

        for page in range(max_pages):
            url = self._build_listing_url(location, page)
            self.logger.info(
                f"Clutch page {page + 1}/{max_pages} for {location}: {url}"
            )

            html = self._fetch_with_selenium(url)
            if not html:
                self.logger.warning(f"Failed to load Clutch page: {url}")
                break

            page_businesses = self._parse_listing_page(html)

            if not page_businesses:
                self.logger.info(
                    f"No more results on page {page + 1} for {location}"
                )
                break

            businesses.extend(page_businesses)

            # Delay between pages
            if page < max_pages - 1:
                delay = random.uniform(*DELAY_BETWEEN_PAGES)
                self.logger.debug(f"Waiting {delay:.1f}s before next page")
                time.sleep(delay)

        self.logger.info(
            f"Found {len(businesses)} MSP listings in {location}"
        )

        return businesses

    def _build_listing_url(self, location: str, page: int = 0) -> str:
        """Build Clutch listing URL with location filter and pagination."""
        params = {'location': location}
        if page > 0:
            params['page'] = page

        return f"{self.base_url}?{urlencode(params)}"

    def _fetch_with_selenium(self, url: str) -> Optional[str]:
        """
        Fetch a page using Selenium (for JS-rendered content).

        Args:
            url: URL to load

        Returns:
            Page HTML or None on failure
        """
        if not self.can_scrape_url(url):
            self.logger.warning(f"Blocked by robots.txt: {url}")
            return None

        try:
            self.stats['requests'] += 1
            self.driver.get(url)

            # Wait for dynamic content to load
            time.sleep(random.uniform(2.0, 4.0))

            # Scroll to trigger lazy loading
            self.driver.execute_script(
                "window.scrollTo(0, document.body.scrollHeight / 2);"
            )
            time.sleep(1.0)
            self.driver.execute_script(
                "window.scrollTo(0, document.body.scrollHeight);"
            )
            time.sleep(1.0)

            html = self.driver.page_source
            self.stats['successes'] += 1
            return html

        except Exception as e:
            self.logger.error(f"Selenium fetch failed for {url}: {e}")
            self.stats['failures'] += 1
            return None

    def _parse_listing_page(self, html: str) -> List[Dict[str, Any]]:
        """
        Parse a Clutch listing page for company cards.

        Args:
            html: Page HTML content

        Returns:
            List of business dicts
        """
        soup = BeautifulSoup(html, 'html.parser')
        businesses = []

        # Clutch uses provider cards with various class patterns
        cards = soup.select(
            '[class*="provider-row"], '
            '[class*="provider__info"], '
            '[class*="company-info"], '
            'li[class*="provider"], '
            '[data-provider-id]'
        )

        if not cards:
            # Fallback: look for link patterns typical of Clutch profiles
            cards = soup.select('div.provider, article.provider')

        if not cards:
            # More generic fallback
            cards = self._find_company_cards(soup)

        for card in cards:
            parsed = self._parse_company_card(card)
            if parsed and parsed.get('name'):
                if self.filter_by_employee_count(parsed):
                    businesses.append(parsed)

        return businesses

    def _find_company_cards(self, soup: BeautifulSoup) -> list:
        """Fallback: find company cards by content pattern."""
        cards = []
        # Look for elements that contain both a link and employee/rating info
        for div in soup.find_all('div'):
            text = div.get_text(strip=True)
            # Heuristic: if div has a link and mentions "employees" it's likely a card
            link = div.find('a', href=lambda h: h and '/profile/' in h)
            if link and ('employee' in text.lower() or 'review' in text.lower()):
                cards.append(div)
        return cards

    def _parse_company_card(
        self, card
    ) -> Optional[Dict[str, Any]]:
        """
        Parse a single Clutch company card.

        Args:
            card: BeautifulSoup element for company card

        Returns:
            Standardized business dict or None
        """
        import re

        # Extract company name
        name = None
        name_el = card.select_one(
            '[class*="company-name"], '
            '[class*="provider-name"], '
            'h3 a, h2 a, '
            '[class*="title"] a'
        )
        if name_el:
            name = name_el.get_text(strip=True)
        else:
            # Try first heading or strong link
            heading = card.find(['h2', 'h3', 'h4'])
            if heading:
                name = heading.get_text(strip=True)

        if not name:
            return None

        # Extract profile URL
        profile_url = None
        profile_link = card.find('a', href=lambda h: h and '/profile/' in h)
        if not profile_link:
            profile_link = card.find('a', href=True)
        if profile_link:
            href = profile_link.get('href', '')
            profile_url = urljoin(CLUTCH_PROFILE_BASE_URL, href)

        # Extract location
        location = None
        loc_el = card.select_one(
            '[class*="location"], '
            '[class*="locality"], '
            '[data-location]'
        )
        if loc_el:
            location = loc_el.get_text(strip=True)

        city, state = self._parse_location(location)

        # Extract employee count
        employee_count = None
        employee_source = None
        text = card.get_text(strip=True)
        emp_match = re.search(
            r'(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)\s*employees?',
            text,
            re.IGNORECASE,
        )
        if emp_match:
            low = int(emp_match.group(1).replace(',', ''))
            high = int(emp_match.group(2).replace(',', ''))
            employee_count = (low + high) // 2
            employee_source = 'clutch'
        else:
            emp_match2 = re.search(
                r'(\d[\d,]+)\+?\s*employees?', text, re.IGNORECASE
            )
            if emp_match2:
                employee_count = int(emp_match2.group(1).replace(',', ''))
                employee_source = 'clutch'

        # Extract rating
        rating = None
        rating_el = card.select_one(
            '[class*="rating"], [class*="score"], [data-rating]'
        )
        if rating_el:
            rating_text = rating_el.get_text(strip=True)
            rating_match = re.search(r'(\d+\.?\d*)', rating_text)
            if rating_match:
                rating = float(rating_match.group(1))

        # Extract hourly rate
        hourly_rate = None
        rate_match = re.search(
            r'\$\s*(\d+)\s*[-–]\s*\$?\s*(\d+)\s*/\s*hr',
            text,
            re.IGNORECASE,
        )
        if rate_match:
            hourly_rate = f"${rate_match.group(1)} - ${rate_match.group(2)}/hr"

        # Extract services
        services = []
        service_els = card.select(
            '[class*="service"] li, '
            '[class*="tag"], '
            '[class*="chip"]'
        )
        for s in service_els[:10]:
            svc = s.get_text(strip=True)
            if svc and len(svc) < 100:
                services.append(svc)

        # Extract review count
        review_count = None
        review_match = re.search(r'(\d+)\s*reviews?', text, re.IGNORECASE)
        if review_match:
            review_count = int(review_match.group(1))

        return {
            'name': name,
            'business_type': 'Managed Service Provider',
            'website': None,  # Available on profile page
            'phone': None,  # Available on profile page
            'address_line1': None,
            'address_line2': None,
            'city': city,
            'state_province': state,
            'postal_code': None,
            'country': 'US',
            'employee_count': employee_count,
            'employee_count_source': employee_source,
            'source': SOURCE_CLUTCH,
            'source_id': profile_url,
            'source_url': profile_url,
            'data_quality_score': None,
            'raw_data': {
                'rating': rating,
                'review_count': review_count,
                'hourly_rate': hourly_rate,
                'services': services,
                'location_raw': location,
            },
        }

    def _enrich_profiles(
        self, businesses: List[Dict[str, Any]], max_profiles: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Follow profile links to extract website URL, phone, and full address.
        Slow — only use for high-value leads.

        Args:
            businesses: List of business dicts
            max_profiles: Max profiles to fetch

        Returns:
            Enriched businesses list
        """
        enriched = 0

        for biz in businesses:
            if enriched >= max_profiles:
                break

            profile_url = biz.get('source_url')
            if not profile_url or '/profile/' not in profile_url:
                continue

            # Skip if already has website
            if biz.get('website'):
                continue

            self.logger.debug(f"Fetching Clutch profile: {profile_url}")
            details = self._scrape_profile_page(profile_url)

            if details:
                biz['website'] = details.get('website') or biz.get('website')
                biz['phone'] = details.get('phone') or biz.get('phone')
                if details.get('address'):
                    biz['address_line1'] = details['address']
                enriched += 1

            delay = random.uniform(*DELAY_BETWEEN_REQUESTS)
            time.sleep(delay)

        self.logger.info(f"Enriched {enriched} businesses with Clutch profile details")
        return businesses

    def _scrape_profile_page(
        self, url: str
    ) -> Optional[Dict[str, Any]]:
        """
        Scrape a single Clutch company profile page.

        Args:
            url: Profile page URL

        Returns:
            Dict with website, phone, address, or None on failure
        """
        import re

        html = self._fetch_with_selenium(url)
        if not html:
            return None

        soup = BeautifulSoup(html, 'html.parser')
        details = {}

        # Extract website
        website_el = soup.select_one(
            'a[class*="website"], '
            'a[href*="website-link"], '
            '[class*="visit-website"] a'
        )
        if website_el:
            href = website_el.get('href', '')
            if href and 'clutch.co' not in href:
                details['website'] = href

        # Fallback: look for external links that aren't social media
        if not details.get('website'):
            for link in soup.find_all('a', href=True):
                href = link.get('href', '')
                if (href.startswith('http') and
                        'clutch.co' not in href and
                        'linkedin.com' not in href and
                        'facebook.com' not in href and
                        'twitter.com' not in href):
                    details['website'] = href
                    break

        # Extract phone
        phone_el = soup.select_one(
            '[class*="phone"], '
            'a[href^="tel:"]'
        )
        if phone_el:
            if phone_el.get('href', '').startswith('tel:'):
                details['phone'] = phone_el['href'].replace('tel:', '')
            else:
                phone_text = phone_el.get_text(strip=True)
                phone_match = re.search(r'[\d\(\)\-\.\s\+]+', phone_text)
                if phone_match:
                    details['phone'] = phone_match.group().strip()

        # Extract address
        addr_el = soup.select_one(
            '[class*="address"], '
            '[class*="location-detail"]'
        )
        if addr_el:
            details['address'] = addr_el.get_text(strip=True)

        return details if details else None

    def _parse_location(self, location: Optional[str]) -> tuple:
        """Parse location string into (city, state)."""
        if not location:
            return None, None

        parts = location.split(',')
        city = parts[0].strip() if len(parts) > 0 else None
        state = parts[1].strip() if len(parts) > 1 else None

        return city, state

    def close(self):
        """Clean up Selenium driver and HTTP client."""
        if self.driver:
            try:
                self.driver.quit()
                self.logger.debug("Selenium WebDriver closed")
            except Exception:
                pass
            self.driver = None
        super().close()
