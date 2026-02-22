#!/usr/bin/env python3
"""
Test script for Yelp API scraper.
Quickly test if your Yelp API key works and see sample results.
"""

import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config.logging_config import logger
from src.config.settings import settings
from src.scrapers.directories.yelp import YelpScraper


def test_yelp_api():
    """Test Yelp API with a small sample."""

    logger.info("=" * 60)
    logger.info("Testing Yelp API Scraper")
    logger.info("=" * 60)

    # Check if API key is configured
    if not settings.YELP_API_KEY or settings.YELP_API_KEY == 'your_yelp_api_key_here':
        logger.error("❌ Yelp API key not configured!")
        logger.error("Please edit .env file and add your Yelp API key:")
        logger.error("  YELP_API_KEY=your_actual_key_here")
        logger.error("")
        logger.error("Get your free API key at:")
        logger.error("  https://www.yelp.com/developers/v3/manage_app")
        return False

    # Initialize scraper
    try:
        scraper = YelpScraper()
        logger.success("✅ Yelp scraper initialized successfully")

    except Exception as e:
        logger.error(f"❌ Failed to initialize Yelp scraper: {e}")
        return False

    # Test with a small search
    test_locations = [
        "San Francisco, CA",
        "New York, NY",
    ]

    logger.info(f"Testing search in {len(test_locations)} cities...")
    logger.info("Searching for: 'managed service provider'")

    try:
        results = scraper.scrape({
            'locations': test_locations,
            'search_term': 'managed service provider',
            'max_results_per_location': 10,  # Small test
        })

        logger.success(f"✅ Search completed successfully!")
        logger.info(f"Found {len(results)} businesses")

        # Display sample results
        if results:
            logger.info("\n" + "=" * 60)
            logger.info("Sample Results (first 5):")
            logger.info("=" * 60)

            for i, business in enumerate(results[:5], 1):
                logger.info(f"\n{i}. {business['name']}")
                logger.info(f"   Location: {business['city']}, {business['state_province']}")
                logger.info(f"   Phone: {business['phone'] or 'N/A'}")
                logger.info(f"   Categories: {business['business_type']}")
                if business['raw_data']:
                    logger.info(f"   Rating: {business['raw_data'].get('rating', 'N/A')}/5")
                    logger.info(f"   Reviews: {business['raw_data'].get('review_count', 0)}")

        # Show statistics
        logger.info("\n" + "=" * 60)
        logger.info("Scraper Statistics:")
        logger.info("=" * 60)

        stats = scraper.get_stats()
        logger.info(f"Total requests: {stats['requests']}")
        logger.info(f"Successful: {stats['successes']}")
        logger.info(f"Failed: {stats['failures']}")
        logger.info(f"Businesses found: {stats['businesses_found']}")

        http_stats = stats['http_stats']
        logger.info(f"Success rate: {http_stats['success_rate']}")

        scraper.close()

        logger.success("\n✅ Yelp API test completed successfully!")
        return True

    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def main():
    """Main entry point."""
    success = test_yelp_api()

    if success:
        logger.info("\n" + "=" * 60)
        logger.info("Next Steps:")
        logger.info("=" * 60)
        logger.info("1. Your Yelp API is working! ✅")
        logger.info("2. Try running a full scrape:")
        logger.info("   python scripts/run_scraper.py --sources yelp")
        logger.info("3. Check the database:")
        logger.info("   sqlite3 data/databases/msp_scraper.db 'SELECT * FROM businesses;'")
        sys.exit(0)
    else:
        logger.error("\n❌ Test failed. Please fix the issues above and try again.")
        sys.exit(1)


if __name__ == '__main__':
    main()
