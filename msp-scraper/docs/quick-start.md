# Quick Start Guide

## Getting Started in 5 Minutes

### 1. Setup Environment

```bash
# Navigate to project
cd ~/msp-scraper

# Add Poetry to PATH (if not already in ~/.zshrc)
export PATH="/Users/nikovernic/.local/bin:$PATH"

# Activate Poetry environment
poetry shell
```

### 2. Configure API Keys

Edit `.env` file and add your Yelp API key:

```bash
# Get free Yelp API key at: https://www.yelp.com/developers/v3/manage_app
YELP_API_KEY=your_actual_api_key_here
```

### 3. Initialize Database

```bash
# Create database tables
python scripts/init_db.py

# Optional: Add sample data for testing
python scripts/init_db.py --seed
```

### 4. Run Your First Scrape

```bash
# Test with Yelp API (easiest, most compliant)
python scripts/run_scraper.py --sources yelp --job-type targeted

# This will:
# - Search for MSP businesses in major US/Canada cities
# - Filter for companies with 3-50 employees (when data available)
# - Store results in SQLite database
```

### 5. Export Results

```bash
# Export to CSV
python scripts/export_data.py

# Find your export in: data/exports/msp_export_[timestamp].csv
```

## What's Next?

### Add More Data Sources

Once Yelp is working, add other sources:

```bash
# Run all sources
python scripts/run_scraper.py --job-type full

# Or specific combinations
python scripts/run_scraper.py --sources yelp yellowpages clutch
```

### Filter and Export

Export with quality filters:

```bash
# Only high-quality data
python scripts/export_data.py --min-quality 0.7

# Only US businesses with owner contacts
python scripts/export_data.py --country US --has-owner-contact

# Only specific state
python scripts/export_data.py --state CA
```

### Enable Automation

Edit `.env`:
```bash
ENABLE_SCHEDULING=true
```

Then run:
```bash
python scripts/schedule_jobs.py
```

This will run:
- Full scrape every Sunday at 2 AM
- Incremental updates Monday-Saturday at 2 AM

## Verification

Check your data:

```bash
# Count businesses
python -c "from src.models import *; db = SessionLocal(); print(f'Total businesses: {db.query(Business).count()}'); db.close()"

# Check logs
tail -f data/logs/scraper_$(date +%Y-%m-%d).log
```

## Common First-Time Issues

### Poetry not found
```bash
export PATH="/Users/nikovernic/.local/bin:$PATH"
# Add this to your ~/.zshrc to make permanent
```

### Yelp API key not working
- Verify key at https://www.yelp.com/developers/v3/manage_app
- Make sure `.env` file has correct format (no quotes needed)
- Check logs: `tail data/logs/errors_*.log`

### No results found
- Yelp may not have many MSP listings
- Try broader search terms in src/config/constants.py
- Use multiple sources together for better coverage

## Tips for Best Results

1. **Start with Yelp**: Easiest and most reliable
2. **Add sources incrementally**: Don't run all at once initially
3. **Monitor rate limits**: Check logs for rate limit warnings
4. **Export regularly**: Don't wait until you have thousands of records
5. **Check data quality**: Filter exports by quality score >= 0.7

## Getting Help

- Check README.md for detailed documentation
- Review logs in `data/logs/`
- Inspect database: `sqlite3 data/databases/msp_scraper.db`

---

Happy scraping! 🚀
