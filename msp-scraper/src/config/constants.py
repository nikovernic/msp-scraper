"""
Application constants.
Contains fixed values used throughout the application.
"""

# ============================================
# Employee Count Filtering
# ============================================
MIN_EMPLOYEES = 3
MAX_EMPLOYEES = 50

# ============================================
# Major US Cities for MSP Targeting
# ============================================
US_MAJOR_CITIES = [
    # Top 50 US cities for MSP market
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA',
    'Austin, TX',
    'Jacksonville, FL',
    'Fort Worth, TX',
    'Columbus, OH',
    'San Francisco, CA',
    'Charlotte, NC',
    'Indianapolis, IN',
    'Seattle, WA',
    'Denver, CO',
    'Boston, MA',
    'El Paso, TX',
    'Nashville, TN',
    'Detroit, MI',
    'Portland, OR',
    'Las Vegas, NV',
    'Oklahoma City, OK',
    'Memphis, TN',
    'Louisville, KY',
    'Baltimore, MD',
    'Milwaukee, WI',
    'Albuquerque, NM',
    'Tucson, AZ',
    'Fresno, CA',
    'Mesa, AZ',
    'Sacramento, CA',
    'Atlanta, GA',
    'Kansas City, MO',
    'Colorado Springs, CO',
    'Raleigh, NC',
    'Miami, FL',
    'Omaha, NE',
    'Long Beach, CA',
    'Virginia Beach, VA',
    'Oakland, CA',
    'Minneapolis, MN',
    'Tampa, FL',
    'Tulsa, OK',
    'Arlington, TX',
    'New Orleans, LA',
    'Wichita, KS',
]

# ============================================
# Major Canadian Cities
# ============================================
CANADA_MAJOR_CITIES = [
    # Top Canadian cities for MSP market
    'Toronto, ON',
    'Montreal, QC',
    'Vancouver, BC',
    'Calgary, AB',
    'Edmonton, AB',
    'Ottawa, ON',
    'Winnipeg, MB',
    'Quebec City, QC',
    'Hamilton, ON',
    'Kitchener, ON',
    'London, ON',
    'Victoria, BC',
    'Halifax, NS',
    'Oshawa, ON',
    'Windsor, ON',
    'Saskatoon, SK',
    'Regina, SK',
    'St. Catharines, ON',
    'Kelowna, BC',
    'Barrie, ON',
]

# Combined list for convenience
ALL_TARGET_CITIES = US_MAJOR_CITIES + CANADA_MAJOR_CITIES

# ============================================
# Business Search Terms
# ============================================
MSP_SEARCH_TERMS = [
    'managed service provider',
    'MSP',
    'IT services',
    'managed IT',
    'IT support',
    'managed services',
    'IT consulting',
    'technology services',
]

# ============================================
# Data Quality Thresholds
# ============================================
MIN_QUALITY_SCORE = 0.5  # Businesses below this may need verification
HIGH_QUALITY_SCORE = 0.8  # High-confidence data
DUPLICATE_MATCH_THRESHOLD = 0.85  # Similarity score for fuzzy matching (0-1)

# ============================================
# Contact Extraction
# ============================================
# Common leadership titles to identify owner/CEO
LEADERSHIP_TITLES = [
    'ceo',
    'chief executive officer',
    'owner',
    'co-owner',
    'founder',
    'co-founder',
    'president',
    'managing director',
    'principal',
    'managing partner',
    'general manager',
]

# Generic email prefixes to filter out (prefer personal emails)
GENERIC_EMAIL_PREFIXES = [
    'info',
    'contact',
    'sales',
    'support',
    'hello',
    'admin',
    'service',
    'help',
    'inquiries',
    'general',
    'office',
]

# ============================================
# Scraper Configuration
# ============================================
# Default rate limits by source (requests per minute)
DEFAULT_RATE_LIMITS = {
    'yellowpages': 15,
    'yelp': 120,  # API allows more
    'clutch': 5,  # Conservative — JS-rendered pages
    'google_places': 60,  # Official API
    'msp501': 10,  # Simple HTML pages
    'website': 10,
}

# Default timeouts by source (seconds)
DEFAULT_TIMEOUTS = {
    'yellowpages': 30,
    'yelp': 15,
    'clutch': 45,  # Selenium pages can be slow
    'google_places': 15,
    'msp501': 30,
    'website': 45,  # Websites can be slower
}

# ============================================
# Clutch.co Configuration
# ============================================
CLUTCH_BASE_URL = 'https://clutch.co/it-services/msp'
CLUTCH_PROFILE_BASE_URL = 'https://clutch.co'

# ============================================
# Google Places Configuration
# ============================================
GOOGLE_PLACES_SEARCH_TERMS = [
    'managed IT services',
    'managed service provider',
    'IT outsourcing',
    'IT managed services company',
]

# ============================================
# MSP 501 Configuration
# ============================================
MSP501_BASE_URL = 'https://www.channelfutures.com/channel-sales-marketing'
MSP501_TIER_RANGES = [
    '50-1',
    '100-51',
    '150-101',
    '200-151',
    '250-201',
    '300-251',
    '350-301',
    '400-351',
    '450-401',
    '501-451',
]

# User agents for rotation
USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
]

# ============================================
# Database Constants
# ============================================
# Job types
JOB_TYPE_FULL = 'full'
JOB_TYPE_INCREMENTAL = 'incremental'
JOB_TYPE_TARGETED = 'targeted'

# Job statuses
JOB_STATUS_PENDING = 'pending'
JOB_STATUS_RUNNING = 'running'
JOB_STATUS_COMPLETED = 'completed'
JOB_STATUS_FAILED = 'failed'

# Verification statuses
VERIFICATION_STATUS_UNVERIFIED = 'unverified'
VERIFICATION_STATUS_VERIFIED = 'verified'
VERIFICATION_STATUS_INVALID = 'invalid'

# Data source names
SOURCE_YELLOWPAGES = 'yellowpages'
SOURCE_YELP = 'yelp'
SOURCE_YELP_API = 'yelp_api'
SOURCE_CLUTCH = 'clutch'
SOURCE_GOOGLE_PLACES = 'google_places'
SOURCE_MSP501 = 'msp501'
SOURCE_COMPANY_WEBSITE = 'company_website'
SOURCE_LINKEDIN = 'linkedin'
SOURCE_MANUAL = 'manual'

# ============================================
# Export Configuration
# ============================================
# CSV export headers
CSV_EXPORT_HEADERS = [
    'business_name',
    'website',
    'phone',
    'email',
    'address',
    'city',
    'state',
    'country',
    'postal_code',
    'employee_count',
    'owner_name',
    'owner_title',
    'owner_email',
    'owner_phone',
    'owner_linkedin',
    'data_quality_score',
    'verification_status',
    'last_updated',
]

# ============================================
# Regex Patterns
# ============================================
import re

# Email validation pattern
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# Phone number pattern (flexible, will be normalized)
PHONE_PATTERN = re.compile(r'(\+?1?\s*)?(\(?\d{3}\)?[\s.-]*)?\d{3}[\s.-]*\d{4}')

# URL pattern
URL_PATTERN = re.compile(
    r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
)

# LinkedIn profile URL pattern
LINKEDIN_PROFILE_PATTERN = re.compile(
    r'(?:https?:)?//(?:[\w]+\.)?linkedin\.com/in/([A-Za-z0-9_-]+)/?'
)

# ============================================
# Scraping Delays
# ============================================
# Random delay ranges (min, max) in seconds
DELAY_BETWEEN_REQUESTS = (2, 5)
DELAY_BETWEEN_PAGES = (3, 6)
DELAY_ON_ERROR = (10, 20)
