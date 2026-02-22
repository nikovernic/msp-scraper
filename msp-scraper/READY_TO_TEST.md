# 🚀 Your MSP Scraper is Ready to Test!

## Quick Start (3 Steps)

### Step 1: Get Your Yelp API Key (2 minutes)

1. Go to: **https://www.yelp.com/developers/v3/manage_app**
2. Sign in (or create free account)
3. Click "Create New App"
4. Fill in:
   - App Name: "MSP Scraper"
   - Industry: "Business Services"
   - Contact Email: (your email)
5. Click "Create App"
6. **Copy your API Key**

### Step 2: Add API Key to .env (30 seconds)

```bash
cd ~/msp-scraper
nano .env
```

Find this line:
```bash
YELP_API_KEY=your_yelp_api_key_here
```

Replace with your actual key:
```bash
YELP_API_KEY=paste_your_actual_key_here
```

Save (Ctrl+O, Enter) and Exit (Ctrl+X)

### Step 3: Run the Test (1 minute)

```bash
cd ~/msp-scraper
export PATH="/Users/nikovernic/.local/bin:$PATH"
poetry shell
python scripts/test_yelp.py
```

## What to Expect

The test will:
1. Verify your API key works ✅
2. Search 2 cities (SF and NYC)
3. Find ~10-20 MSP businesses
4. Display sample results
5. Show statistics

**Sample Output:**
```
==============================================================
Testing Yelp API Scraper
==============================================================
✅ Yelp scraper initialized successfully
Testing search in 2 cities...

Found 18 businesses

Sample Results (first 5):
1. TechPro IT Solutions
   Location: San Francisco, CA
   Phone: +14155551234
   Rating: 4.5/5

[... more results ...]

✅ Yelp API test completed successfully!
```

## What You Get

**From Yelp API (per business):**
- ✅ Business name
- ✅ Full address (street, city, state, zip)
- ✅ Phone number
- ✅ Business categories
- ✅ Rating and review count
- ✅ Yelp URL
- ❌ Employee count (not available from Yelp)
- ❌ Owner/CEO info (not available from Yelp)

**Note**: We'll add other data sources to get employee counts and owner info.

## Free Tier Limits

**Yelp Fusion API (Free):**
- 5,000 API calls per day
- 50 results per call
- Max 1,000 total results per search

**What this means:**
- You can search ~100 cities per day
- Get 10-50 businesses per city
- Total: 1,000-5,000 businesses per day

## If Test Fails

### "API key not configured"
- Make sure you edited `.env` file
- No quotes around the API key
- Save the file after editing

### "Invalid API key" or 401 error
- Double-check you copied the full key
- Make sure it's the API Key, not Client ID
- Verify at: https://www.yelp.com/developers/v3/manage_app

### "ModuleNotFoundError"
```bash
# Reinstall dependencies
cd ~/msp-scraper
poetry install
```

### Import errors
```bash
# Make sure Poetry environment is activated
poetry shell

# Then run test
python scripts/test_yelp.py
```

## What's Built So Far

### ✅ Phase 1: Foundation
- Project structure
- Database models
- Configuration system
- Logging

### ✅ Phase 2: Core Scraping
- HTTP client with rate limiting
- Robots.txt checker
- Data validators
- Base scraper class
- **Yelp API scraper** ← You can test this now!

### 🚧 Phase 3-7: Coming Next
- Data processing pipeline
- More scrapers (Yellow Pages, Clutch)
- Contact extraction from websites
- Orchestration & scheduling
- CSV export
- Automated running

## Next Steps After Testing

Once your test works:

### Option 1: Collect Real Data
```bash
# Search all major US cities
python scripts/run_scraper.py --sources yelp --job-type full
```

### Option 2: Build More Scrapers
- Yellow Pages (for employee counts)
- Clutch (for verified MSP businesses)
- Website scraping (for owner/CEO contacts)

### Option 3: Add Data Processing
- Save results to database
- Deduplicate businesses
- Calculate quality scores
- Export to CSV

## File Locations

```
~/msp-scraper/
├── .env                           ← Add your API key here
├── scripts/test_yelp.py          ← Run this to test
├── src/scrapers/directories/yelp.py  ← Yelp scraper
├── data/databases/msp_scraper.db ← Your database
└── data/logs/                     ← Check logs if issues
```

## Quick Commands

```bash
# Test Yelp API
python scripts/test_yelp.py

# Check database
sqlite3 data/databases/msp_scraper.db "SELECT COUNT(*) FROM businesses;"

# View logs
tail -f data/logs/scraper_$(date +%Y-%m-%d).log

# Get help
python scripts/test_yelp.py --help
```

## Support

If you encounter issues:
1. Check `data/logs/errors_*.log`
2. Verify API key in `.env`
3. Make sure Poetry environment is active: `poetry shell`
4. Try reinstalling: `poetry install`

## Ready? Let's Go! 🎯

```bash
cd ~/msp-scraper
poetry shell
python scripts/test_yelp.py
```

---

**You're 3 steps away from scraping your first MSP businesses!** 🚀
