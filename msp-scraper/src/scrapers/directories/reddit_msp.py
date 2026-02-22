"""
Reddit r/msp scraper — extracts MSP business mentions from the r/msp subreddit.
Uses the official Reddit OAuth API. Pulls company names, websites, and locations
from user flairs, post content, shared URLs, and self-promotion threads.
"""

import re
import time
import random
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

from src.scrapers.base_scraper import BaseScraper
from src.config.settings import settings
from src.config.constants import (
    DEFAULT_RATE_LIMITS,
    DEFAULT_TIMEOUTS,
    SOURCE_REDDIT,
    REDDIT_MSP_SUBREDDIT,
    REDDIT_OAUTH_URL,
    REDDIT_TOKEN_URL,
    REDDIT_COMPANY_KEYWORDS,
    URL_PATTERN,
)


class RedditMSPScraper(BaseScraper):
    """
    Scrapes r/msp subreddit for MSP business mentions.
    Uses Reddit OAuth API — requires client_id and client_secret.

    Extraction strategy:
    - User flairs (company name, role)
    - URLs in post/comment bodies (company websites)
    - Self-ID patterns ("my MSP", "our company", "I run")
    - "Who are you" / intro threads where people describe their MSP
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        config = config or {}
        config.setdefault('rate_limit', DEFAULT_RATE_LIMITS.get('reddit', 30))
        config.setdefault('timeout', DEFAULT_TIMEOUTS.get('reddit', 15))
        super().__init__(config)

        self.client_id = self.config.get('client_id') or settings.REDDIT_CLIENT_ID
        self.client_secret = self.config.get('client_secret') or settings.REDDIT_CLIENT_SECRET
        self.user_agent = self.config.get('user_agent') or settings.REDDIT_USER_AGENT

        if not self.client_id or not self.client_secret:
            raise ValueError(
                "Reddit API credentials required. "
                "Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env. "
                "Create a 'script' app at: https://www.reddit.com/prefs/apps"
            )

        self.access_token = None
        self.subreddit = REDDIT_MSP_SUBREDDIT

        self.logger.info("RedditMSPScraper initialized")

    def _authenticate(self):
        """Get OAuth access token from Reddit."""
        if self.access_token:
            return

        try:
            self.stats['requests'] += 1
            response = self.http_client.post(
                REDDIT_TOKEN_URL,
                auth=(self.client_id, self.client_secret),
                data={'grant_type': 'client_credentials'},
                headers={'User-Agent': self.user_agent},
            )
            data = response.json()

            if 'access_token' in data:
                self.access_token = data['access_token']
                self.stats['successes'] += 1
                self.logger.info("Reddit OAuth authentication successful")
            else:
                self.stats['failures'] += 1
                raise ValueError(
                    f"Reddit auth failed: {data.get('error', 'Unknown error')}"
                )
        except Exception as e:
            self.stats['failures'] += 1
            raise RuntimeError(f"Reddit authentication failed: {e}")

    def _api_get(self, endpoint: str, params: Optional[dict] = None) -> Optional[dict]:
        """Make authenticated GET request to Reddit OAuth API."""
        if not self.access_token:
            self._authenticate()

        url = f"{REDDIT_OAUTH_URL}{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'User-Agent': self.user_agent,
        }

        try:
            self.stats['requests'] += 1
            response = self.http_client.get(url, headers=headers, params=params)
            self.stats['successes'] += 1
            return response.json()
        except Exception as e:
            self.logger.error(f"Reddit API request failed: {e}")
            self.stats['failures'] += 1
            return None

    def scrape(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Scrape r/msp for MSP business mentions.

        Args:
            params: Scraping parameters
                - max_posts: Max posts to scan (default: 200)
                - sort: Post sort order (default: 'new')
                - scan_comments: Whether to scan comments too (default: True)
                - max_comments_per_post: Max comments to scan per post (default: 50)

        Returns:
            List of business data dictionaries
        """
        max_posts = params.get('max_posts', 200)
        sort = params.get('sort', 'new')
        scan_comments = params.get('scan_comments', True)
        max_comments = params.get('max_comments_per_post', 50)

        self._authenticate()

        # Collect raw mentions from different sources
        mentions = {}  # keyed by normalized identifier to dedupe

        # 1. Scan posts
        self.logger.info(f"Scanning r/{self.subreddit} posts (up to {max_posts})...")
        posts = self._fetch_posts(max_posts=max_posts, sort=sort)
        self.logger.info(f"Fetched {len(posts)} posts")

        for post in posts:
            self._extract_from_post(post, mentions)

            # Scan comments on promising posts
            if scan_comments and self._is_promising_post(post):
                post_id = post['data'].get('id')
                if post_id:
                    comments = self._fetch_comments(post_id, max_comments)
                    for comment in comments:
                        self._extract_from_comment(comment, mentions)

                    time.sleep(random.uniform(0.3, 0.8))

        # 2. Search for self-promotion / intro threads specifically
        self.logger.info("Searching for intro/self-promotion threads...")
        intro_posts = self._search_posts(
            'title:("who are you" OR "introduce yourself" OR "my msp" OR "our company")',
            limit=50,
        )
        for post in intro_posts:
            self._extract_from_post(post, mentions)
            if scan_comments:
                post_id = post['data'].get('id')
                if post_id:
                    comments = self._fetch_comments(post_id, max_comments)
                    for comment in comments:
                        self._extract_from_comment(comment, mentions)
                    time.sleep(random.uniform(0.3, 0.8))

        # Convert mentions to standardized business dicts
        businesses = []
        for key, mention in mentions.items():
            biz = self._mention_to_business(mention)
            if biz and self.filter_by_employee_count(biz):
                businesses.append(biz)

        self.stats['businesses_found'] = len(businesses)
        self.logger.info(
            f"Reddit r/{self.subreddit} scrape complete: "
            f"{len(businesses)} businesses extracted from {len(mentions)} mentions"
        )

        return businesses

    def _fetch_posts(self, max_posts: int, sort: str = 'new') -> list:
        """Fetch posts from subreddit with pagination."""
        posts = []
        after = None

        while len(posts) < max_posts:
            limit = min(100, max_posts - len(posts))  # Reddit max per request
            params = {'limit': limit, 'raw_json': 1}
            if after:
                params['after'] = after

            data = self._api_get(f"/r/{self.subreddit}/{sort}", params=params)
            if not data or 'data' not in data:
                break

            batch = data['data'].get('children', [])
            if not batch:
                break

            posts.extend(batch)
            after = data['data'].get('after')
            if not after:
                break

            time.sleep(random.uniform(0.3, 0.6))

        return posts

    def _fetch_comments(self, post_id: str, max_comments: int = 50) -> list:
        """Fetch comments for a specific post."""
        data = self._api_get(
            f"/r/{self.subreddit}/comments/{post_id}",
            params={'limit': max_comments, 'depth': 2, 'raw_json': 1},
        )

        if not data or not isinstance(data, list) or len(data) < 2:
            return []

        comments = []
        self._flatten_comments(data[1].get('data', {}).get('children', []), comments)
        return comments[:max_comments]

    def _flatten_comments(self, children: list, result: list):
        """Recursively flatten comment tree."""
        for child in children:
            if child.get('kind') == 't1':  # Comment
                result.append(child)
                replies = child.get('data', {}).get('replies')
                if isinstance(replies, dict):
                    self._flatten_comments(
                        replies.get('data', {}).get('children', []),
                        result,
                    )

    def _search_posts(self, query: str, limit: int = 50) -> list:
        """Search subreddit for specific posts."""
        data = self._api_get(
            f"/r/{self.subreddit}/search",
            params={
                'q': query,
                'restrict_sr': 'on',
                'sort': 'relevance',
                'limit': limit,
                'raw_json': 1,
            },
        )

        if not data or 'data' not in data:
            return []

        return data['data'].get('children', [])

    def _is_promising_post(self, post: dict) -> bool:
        """Check if a post is likely to contain business mentions in comments."""
        data = post.get('data', {})
        title = (data.get('title') or '').lower()
        selftext = (data.get('selftext') or '').lower()
        num_comments = data.get('num_comments', 0)

        # Skip low-engagement posts
        if num_comments < 5:
            return False

        # Check for discussion-type posts
        promising_patterns = [
            'who', 'introduce', 'what do you', 'how do you',
            'your msp', 'your company', 'share your', 'tell us',
            'what tools', 'what stack', 'recommendation',
            'how many', 'employees', 'revenue', 'clients',
        ]

        text = f"{title} {selftext}"
        return any(p in text for p in promising_patterns)

    def _extract_from_post(self, post: dict, mentions: dict):
        """Extract business mentions from a post."""
        data = post.get('data', {})

        author = data.get('author', '')
        flair = data.get('author_flair_text') or ''
        title = data.get('title') or ''
        selftext = data.get('selftext') or ''
        url = data.get('url') or ''
        permalink = data.get('permalink') or ''

        # Extract from user flair
        if flair:
            self._extract_from_flair(flair, author, permalink, mentions)

        # Extract URLs from post body
        body = f"{title}\n{selftext}"
        self._extract_urls(body, author, flair, permalink, mentions)

        # Extract company names from self-ID patterns
        self._extract_company_mentions(body, author, flair, permalink, mentions)

        # If the post URL itself is a company website (not reddit/imgur/etc)
        if url and not self._is_social_or_hosting_url(url):
            domain = urlparse(url).netloc
            if domain:
                self._add_mention(mentions, {
                    'name': domain,
                    'website': url,
                    'reddit_user': author,
                    'reddit_flair': flair,
                    'reddit_url': f"https://reddit.com{permalink}",
                    'context': f"Shared link in post: {title[:100]}",
                    'confidence': 'low',
                })

    def _extract_from_comment(self, comment: dict, mentions: dict):
        """Extract business mentions from a comment."""
        data = comment.get('data', {})

        author = data.get('author', '')
        flair = data.get('author_flair_text') or ''
        body = data.get('body') or ''
        permalink = data.get('permalink') or ''

        if not body or author in ('[deleted]', 'AutoModerator'):
            return

        # Flair
        if flair:
            self._extract_from_flair(flair, author, permalink, mentions)

        # URLs
        self._extract_urls(body, author, flair, permalink, mentions)

        # Company name patterns
        self._extract_company_mentions(body, author, flair, permalink, mentions)

    def _extract_from_flair(
        self, flair: str, author: str, permalink: str, mentions: dict
    ):
        """
        Parse user flair for company info.
        Common flair patterns:
        - "CEO @ CompanyName"
        - "Owner - CompanyName"
        - "CompanyName | MSP"
        - "CompanyName - Denver, CO"
        """
        flair = flair.strip()
        if not flair or len(flair) < 3:
            return

        # Skip generic flairs
        generic = ['msp', 'it', 'sysadmin', 'vendor', 'verified']
        if flair.lower() in generic:
            return

        company = None
        location = None

        # Pattern: "Role @ Company" or "Role at Company"
        match = re.match(
            r'(?:ceo|owner|founder|president|cto|coo|director|vp|manager|tech)'
            r'\s*[@|at|-]\s*(.+)',
            flair, re.IGNORECASE,
        )
        if match:
            company = match.group(1).strip()

        # Pattern: "Company | Role" or "Company - Role"
        if not company:
            match = re.match(r'(.+?)\s*[|\-–]\s*(.+)', flair)
            if match:
                left, right = match.group(1).strip(), match.group(2).strip()
                # Heuristic: the side with a title word is the role, other is company
                title_words = ['ceo', 'owner', 'founder', 'msp', 'tech', 'admin',
                               'manager', 'director', 'engineer', 'sysadmin']
                if any(w in right.lower() for w in title_words):
                    company = left
                elif any(w in left.lower() for w in title_words):
                    company = right
                else:
                    # Default: left side is company
                    company = left

        # Pattern: just a company name (no separator)
        if not company:
            # If flair doesn't look like a role/title, treat it as company name
            role_only = ['ceo', 'owner', 'founder', 'msp owner', 'it manager',
                         'sysadmin', 'tech', 'consultant', 'engineer']
            if flair.lower() not in role_only and not flair.lower().startswith('http'):
                company = flair

        # Try to extract location from company string
        if company:
            loc_match = re.search(r'[-–,]\s*([A-Z][a-zA-Z\s.]+,\s*[A-Z]{2})\s*$', company)
            if loc_match:
                location = loc_match.group(1).strip()
                company = company[:loc_match.start()].strip()

        if company and len(company) >= 2 and len(company) <= 100:
            # Clean up
            company = company.strip(' -–|@')
            if company:
                self._add_mention(mentions, {
                    'name': company,
                    'location_raw': location,
                    'reddit_user': author,
                    'reddit_flair': flair,
                    'reddit_url': f"https://reddit.com{permalink}" if permalink else None,
                    'context': f"User flair: {flair}",
                    'confidence': 'high',
                })

    def _extract_urls(
        self, text: str, author: str, flair: str, permalink: str, mentions: dict
    ):
        """Extract company website URLs from text."""
        urls = re.findall(r'https?://[^\s\)\]>]+', text)

        for url in urls:
            # Clean trailing punctuation
            url = url.rstrip('.,;:!?\'\")')

            if self._is_social_or_hosting_url(url):
                continue

            parsed = urlparse(url)
            domain = parsed.netloc.lower()

            # Skip common non-company domains
            if not domain or domain.startswith('www.'):
                domain = domain[4:] if domain.startswith('www.') else domain

            if not domain or '.' not in domain:
                continue

            self._add_mention(mentions, {
                'name': domain.split('.')[0].title(),  # rough name from domain
                'website': f"{parsed.scheme}://{parsed.netloc}",
                'reddit_user': author,
                'reddit_flair': flair,
                'reddit_url': f"https://reddit.com{permalink}" if permalink else None,
                'context': f"URL shared in post/comment",
                'confidence': 'medium',
            })

    def _extract_company_mentions(
        self, text: str, author: str, flair: str, permalink: str, mentions: dict
    ):
        """Extract company names from self-identifying patterns in text."""
        text_lower = text.lower()

        # Only process if text contains self-identification keywords
        if not any(kw in text_lower for kw in REDDIT_COMPANY_KEYWORDS):
            return

        # Pattern: "at [Company Name]" or "called [Company Name]"
        patterns = [
            r'(?:my (?:msp|company|firm|business) (?:is |called |named ))([A-Z][A-Za-z0-9\s&.]+)',
            r'(?:I (?:run|own|founded|started) )([A-Z][A-Za-z0-9\s&.]+)',
            r'(?:we\'?r?e? (?:are |called |named ))([A-Z][A-Za-z0-9\s&.]+)',
            r'(?:work(?:ing)? (?:at|for) )([A-Z][A-Za-z0-9\s&.]+)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                name = match.strip().rstrip('.')
                # Filter out common false positives
                if (len(name) >= 3 and len(name) <= 60 and
                        not self._is_common_word(name)):
                    self._add_mention(mentions, {
                        'name': name,
                        'reddit_user': author,
                        'reddit_flair': flair,
                        'reddit_url': f"https://reddit.com{permalink}" if permalink else None,
                        'context': f"Self-identified in text",
                        'confidence': 'medium',
                    })

    def _add_mention(self, mentions: dict, mention: dict):
        """Add or merge a business mention, deduplicating by normalized key."""
        name = mention.get('name', '').strip()
        website = mention.get('website', '')

        if not name:
            return

        # Normalize key: prefer website domain, fallback to lowercase name
        if website:
            domain = urlparse(website).netloc.lower().replace('www.', '')
            key = domain
        else:
            key = re.sub(r'[^a-z0-9]', '', name.lower())

        if not key:
            return

        if key in mentions:
            existing = mentions[key]
            # Merge: keep higher confidence data, fill gaps
            if not existing.get('website') and mention.get('website'):
                existing['website'] = mention['website']
            if not existing.get('location_raw') and mention.get('location_raw'):
                existing['location_raw'] = mention['location_raw']
            # Upgrade confidence
            conf_order = {'low': 0, 'medium': 1, 'high': 2}
            if conf_order.get(mention.get('confidence'), 0) > conf_order.get(existing.get('confidence'), 0):
                existing['confidence'] = mention['confidence']
                if mention.get('name') and len(mention['name']) > len(existing.get('name', '')):
                    existing['name'] = mention['name']
            # Append context
            existing.setdefault('contexts', []).append(mention.get('context', ''))
            existing['mention_count'] = existing.get('mention_count', 1) + 1
        else:
            mention['mention_count'] = 1
            mention.setdefault('contexts', [mention.get('context', '')])
            mentions[key] = mention

    def _mention_to_business(self, mention: dict) -> Optional[Dict[str, Any]]:
        """Convert a raw mention into a standardized business dict."""
        name = mention.get('name', '').strip()
        if not name or len(name) < 2:
            return None

        # Parse location if available
        city, state = None, None
        location_raw = mention.get('location_raw')
        if location_raw:
            parts = location_raw.split(',')
            city = parts[0].strip() if len(parts) > 0 else None
            state = parts[1].strip() if len(parts) > 1 else None

        # Determine data quality hint based on confidence and mention count
        confidence = mention.get('confidence', 'low')
        mention_count = mention.get('mention_count', 1)

        return {
            'name': name,
            'business_type': 'Managed Service Provider',
            'website': mention.get('website'),
            'phone': None,
            'address_line1': None,
            'address_line2': None,
            'city': city,
            'state_province': state,
            'postal_code': None,
            'country': 'US',
            'employee_count': None,
            'employee_count_source': None,
            'source': SOURCE_REDDIT,
            'source_id': mention.get('reddit_user'),
            'source_url': mention.get('reddit_url'),
            'data_quality_score': None,
            'raw_data': {
                'reddit_user': mention.get('reddit_user'),
                'reddit_flair': mention.get('reddit_flair'),
                'confidence': confidence,
                'mention_count': mention_count,
                'contexts': mention.get('contexts', [])[:5],
            },
        }

    def _is_social_or_hosting_url(self, url: str) -> bool:
        """Check if URL is a social media, image host, or other non-company site."""
        skip_domains = {
            'reddit.com', 'redd.it', 'imgur.com', 'i.imgur.com',
            'youtube.com', 'youtu.be', 'twitter.com', 'x.com',
            'facebook.com', 'linkedin.com', 'instagram.com',
            'github.com', 'gist.github.com', 'pastebin.com',
            'docs.google.com', 'drive.google.com', 'google.com',
            'amazon.com', 'amzn.to', 'wikipedia.org',
            'medium.com', 'substack.com', 'wordpress.com',
            'technet.microsoft.com', 'learn.microsoft.com',
            'microsoft.com', 'apple.com',
        }
        try:
            domain = urlparse(url).netloc.lower().replace('www.', '')
            return domain in skip_domains
        except Exception:
            return True

    def _is_common_word(self, text: str) -> bool:
        """Check if text is a common English word/phrase (false positive filter)."""
        common = {
            'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have',
            'they', 'but', 'not', 'are', 'was', 'all', 'can', 'had',
            'one', 'our', 'out', 'you', 'her', 'him', 'his', 'how',
            'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who',
            'did', 'get', 'has', 'let', 'say', 'she', 'too', 'use',
            'managed service provider', 'managed services', 'it services',
            'help desk', 'break fix', 'remote support', 'it support',
        }
        return text.lower().strip() in common
