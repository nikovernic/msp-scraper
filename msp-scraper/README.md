# MSP Business Scraper

A Python-based web scraper for finding Managed Service Provider (MSP) businesses across the United States and Canada. Specifically targets companies with 3-50 employees and extracts owner/CEO contact information for partnership outreach.

## Features

- **Multi-Source Scraping**: Yelp API, Yellow Pages, Clutch, and company websites
- **Smart Filtering**: Automatically filters for MSP businesses with 3-50 employees
- **Contact Extraction**: Finds owner/CEO contact information including email, phone, and LinkedIn
- **Database Storage**: SQLite database with easy PostgreSQL upgrade path
- **Data Quality Scoring**: Automatically scores data quality (0-1) based on completeness
- **Deduplication**: Intelligent duplicate detection using exact and fuzzy matching
- **Scheduled Automation**: Run full or incremental scrapes on schedule
- **CSV Export**: Export filtered results to CSV for CRM import
- **Compliance-First**: Respects robots.txt, rate limits, and ToS

## Tech Stack

- Python 3.14+
- SQLAlchemy (ORM)
- Beautiful Soup & Selenium (scraping)
- APScheduler (scheduling)
- Loguru (logging)
- Poetry (dependency management)

## Project Structure

```
msp-scraper/
├── src/
│   ├── config/          # Configuration (settings, constants, logging)
│   ├── models/          # Database models
│   ├── scrapers/        # Scraper implementations
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── scripts/             # Operational scripts
├── tests/               # Test suite
├── data/                # Data storage (databases, exports, logs)
└── docs/                # Documentation
```

## Installation

### Prerequisites

- Python 3.14 or higher
- Poetry (installed during setup)

### Setup Steps

1. **Navigate to project directory:**
   ```bash
   cd ~/msp-scraper
   ```

2. **Add Poetry to PATH:**
   ```bash
   export PATH="/Users/nikovernic/.local/bin:$PATH"
   # Add this line to your ~/.zshrc or ~/.bash_profile to make it permanent
   ```

3. **Verify Poetry installation:**
   ```bash
   poetry --version
   ```

4. **Install dependencies:**
   ```bash
   poetry install
   ```

5. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Configuration section)
   ```

6. **Initialize database:**
   ```bash
   poetry run python scripts/init_db.py
   ```

7. **Optional: Seed with sample data for testing:**
   ```bash
   poetry run python scripts/init_db.py --seed
   ```

## Configuration

Edit `.env` file with your settings:

### Required Configuration

```bash
# Database (default SQLite)
DATABASE_URL=sqlite:///data/databases/msp_scraper.db

# Yelp API (get free key at https://www.yelp.com/developers/v3/manage_app)
YELP_API_KEY=your_yelp_api_key_here
YELP_USE_API=true
```

### Optional Configuration

```bash
# Scraping
RATE_LIMIT_RPM=10                    # Requests per minute
RESPECT_ROBOTS_TXT=true              # Respect robots.txt

# Logging
LOG_LEVEL=INFO                       # DEBUG, INFO, WARNING, ERROR
LOG_FILE=data/logs/scraper.log

# Scheduling
ENABLE_SCHEDULING=false              # Enable automated scheduling
```

See `.env.example` for all configuration options.

## Usage

### Activate Poetry Environment

All commands should be run within the Poetry virtual environment:

```bash
poetry shell
```

Or prefix commands with `poetry run`:

```bash
poetry run python scripts/run_scraper.py
```

### Initialize Database

Create all database tables:

```bash
python scripts/init_db.py
```

Reset database (⚠️ deletes all data):

```bash
python scripts/init_db.py --reset
```

### Run Scraper

**Manual execution:**

```bash
# Full scrape (all sources, all cities)
python scripts/run_scraper.py --job-type full

# Incremental scrape (top 20 cities only)
python scripts/run_scraper.py --job-type incremental

# Specific sources only
python scripts/run_scraper.py --sources yelp clutch

# Targeted scrape (specific parameters)
python scripts/run_scraper.py --job-type targeted --sources yellowpages
```

**Scheduled execution:**

```bash
# Enable in .env first: ENABLE_SCHEDULING=true
python scripts/schedule_jobs.py
```

Default schedule:
- Full scrape: Sunday 2 AM
- Incremental: Monday-Saturday 2 AM

### Export Data

Export businesses to CSV:

```bash
# Export all businesses
python scripts/export_data.py

# Export with filters
python scripts/export_data.py --min-quality 0.7 --country US

# Export only businesses with owner contacts
python scripts/export_data.py --has-owner-contact
```

CSV output includes:
- Business name, website, phone, email
- Full address (city, state, country)
- Employee count
- Owner/CEO contact details
- Data quality score

## Data Sources

### 1. Yelp (Recommended - API)
- **Method**: Official Yelp Fusion API
- **Compliance**: ✅ Fully compliant
- **Cost**: Free (5000 calls/day)
- **Data**: Business info, location, phone
- **Setup**: Get API key at [Yelp Developers](https://www.yelp.com/developers/v3/manage_app)

### 2. Yellow Pages
- **Method**: Web scraping
- **Compliance**: ✅ Respects robots.txt
- **Data**: Business info, phone, address, sometimes employee count
- **Rate Limit**: 10-20 requests/minute

### 3. Clutch
- **Method**: Web scraping
- **Compliance**: ✅ Respects robots.txt
- **Data**: MSP-focused, verified listings, company size
- **Rate Limit**: 10 requests/minute
- **Best For**: Employee count data

### 4. Company Websites
- **Method**: Selenium-based scraping
- **Use Case**: Enrichment for high-quality leads
- **Data**: Owner/CEO details, contact pages, team bios
- **Rate Limit**: 5-10 requests/minute per domain

### 5. LinkedIn (Manual Only)
- **Method**: Manual export from Sales Navigator
- **Compliance**: ⚠️ Do NOT automate (violates ToS)
- **Recommended**: Use third-party providers (ZoomInfo, Apollo.io)

## Compliance & Legal

This scraper is designed with compliance in mind:

✅ **Respects robots.txt** for all domains
✅ **Rate limiting** to avoid server overload
✅ **Clear user agent** identifying the scraper
✅ **Uses official APIs** where available (Yelp)
✅ **Scrapes only public data** from business directories

### Best Practices

1. Review Terms of Service for each data source regularly
2. Only use for B2B partnership outreach
3. Honor opt-out requests
4. Store only business contact info (not personal)
5. Consider GDPR/CCPA compliance for outreach

### Alternatives to Scraping

For commercial use, consider purchasing data from:
- ZoomInfo
- Apollo.io
- Clearbit
- Hunter.io
- LinkedIn Sales Navigator (manual export)

## Development

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=src

# Run specific test file
poetry run pytest tests/unit/test_models.py
```

### Code Formatting

```bash
# Format code with Black
poetry run black src/ scripts/ tests/

# Lint with Flake8
poetry run flake8 src/ scripts/ tests/

# Type checking with MyPy
poetry run mypy src/
```

### Database Migrations

This project uses Alembic for database migrations:

```bash
# Create migration
poetry run alembic revision --autogenerate -m "Description"

# Apply migrations
poetry run alembic upgrade head

# Rollback migration
poetry run alembic downgrade -1
```

## Database Schema

### Core Tables

- **businesses**: MSP company information
- **contacts**: Owner/CEO contact details
- **scrape_jobs**: Job execution tracking
- **scrape_sources**: Source attribution for data

### Relationships

```
Business (1) <---> (Many) Contacts
Business (1) <---> (Many) ScrapeSources
ScrapeJob (1) <---> (Many) ScrapeSources
```

## Monitoring

### Logs

Logs are stored in `data/logs/`:
- `scraper_YYYY-MM-DD.log` - General logs (30 day retention)
- `errors_YYYY-MM-DD.log` - Error logs (90 day retention)
- `scraping_YYYY-MM-DD.log` - Scraping activity (30 day retention)

### Database Stats

Check database stats:

```bash
poetry run python -c "from src.models import *; db = SessionLocal(); print(f'Businesses: {db.query(Business).count()}'); print(f'Contacts: {db.query(Contact).count()}'); db.close()"
```

## Troubleshooting

### Poetry installation issues

```bash
# If poetry command not found, add to PATH:
export PATH="/Users/nikovernic/.local/bin:$PATH"

# Or use full path:
/Users/nikovernic/.local/bin/poetry --version
```

### Database locked errors (SQLite)

SQLite doesn't handle concurrent writes well. Solutions:
1. Reduce concurrent scrapers
2. Upgrade to PostgreSQL for production

### Scraper getting blocked

If a scraper is getting blocked:
1. Check robots.txt compliance
2. Reduce rate limit in `.env`
3. Add random delays between requests
4. Consider using proxies (advanced)

## Roadmap

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Database models
- [x] Configuration system
- [x] Logging

### Phase 2: Core Scraping (In Progress)
- [ ] Base scraper framework
- [ ] Yelp API integration
- [ ] Yellow Pages scraper
- [ ] Data processing pipeline

### Phase 3: Additional Features
- [ ] Clutch scraper
- [ ] Website enrichment
- [ ] Contact extraction
- [ ] Deduplication service

### Phase 4: Automation
- [ ] Scrape orchestrator
- [ ] Scheduling system
- [ ] Export functionality
- [ ] Monitoring & reporting

### Phase 5: Production
- [ ] Comprehensive tests
- [ ] Performance optimization
- [ ] Error monitoring
- [ ] Production deployment

## Support

For issues or questions:
1. Check the logs in `data/logs/`
2. Review configuration in `.env`
3. Consult documentation in `docs/`

## License

This project is for internal use only. Ensure compliance with all applicable laws and Terms of Service when scraping data.

---

**Built for partnership outreach with MSP businesses across US & Canada**
