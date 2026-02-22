#!/usr/bin/env python3
"""
Main scraper script.
Runs scraping jobs and saves results to database.
"""

import sys
from pathlib import Path
from datetime import datetime

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config.logging_config import logger
from src.config.settings import settings
from src.config.constants import ALL_TARGET_CITIES, US_MAJOR_CITIES, CANADA_MAJOR_CITIES
from src.models import ScrapeJob, SessionLocal
from src.scrapers.directories.yelp import YelpScraper
from src.scrapers.directories.google_places import GooglePlacesScraper
from src.scrapers.directories.clutch import ClutchScraper
from src.scrapers.directories.msp501 import MSP501Scraper
from src.scrapers.directories.reddit_msp import RedditMSPScraper
from src.services.data_processor import DataProcessor


VALID_SOURCES = ['yelp', 'google', 'clutch', 'msp501', 'reddit', 'all']


def run_scrape(
    sources: list = None,
    job_type: str = 'full',
    max_cities: int = None
):
    """
    Run scraping job.

    Args:
        sources: List of sources to scrape (default: ['yelp'])
        job_type: Job type ('full', 'incremental', 'targeted')
        max_cities: Maximum number of cities to search (for testing)
    """
    sources = sources or ['yelp']

    # Expand 'all' into individual sources
    if 'all' in sources:
        sources = ['yelp', 'google', 'clutch', 'msp501', 'reddit']

    logger.info("=" * 70)
    logger.info(f"MSP Scraper - {job_type.upper()} Job")
    logger.info("=" * 70)
    logger.info(f"Sources: {', '.join(sources)}")
    logger.info(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 70)

    # Create scrape job record
    db = SessionLocal()
    job = ScrapeJob(
        job_type=job_type,
        data_source=','.join(sources),
        status='pending',
    )
    db.add(job)
    db.commit()
    job_id = job.id
    db.close()

    # Determine cities to search
    if job_type == 'full':
        cities = ALL_TARGET_CITIES
    elif job_type == 'incremental':
        cities = ALL_TARGET_CITIES[:20]  # Top 20 cities
    else:  # targeted
        cities = ALL_TARGET_CITIES[:5]  # Just a few

    if max_cities:
        cities = cities[:max_cities]

    logger.info(f"Searching {len(cities)} cities...")

    # Mark job as running
    db = SessionLocal()
    job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
    job.mark_started()
    db.commit()
    db.close()

    all_businesses = []

    try:
        # Run scrapers
        for source in sources:
            if source == 'yelp':
                logger.info("\n" + "=" * 70)
                logger.info("Running Yelp API Scraper")
                logger.info("=" * 70)

                businesses = run_yelp_scraper(cities, job_type)
                all_businesses.extend(businesses)

            elif source == 'google':
                logger.info("\n" + "=" * 70)
                logger.info("Running Google Places API Scraper")
                logger.info("=" * 70)

                businesses = run_google_places_scraper(cities, job_type)
                all_businesses.extend(businesses)

            elif source == 'clutch':
                logger.info("\n" + "=" * 70)
                logger.info("Running Clutch.co Scraper")
                logger.info("=" * 70)

                businesses = run_clutch_scraper(cities, job_type)
                all_businesses.extend(businesses)

            elif source == 'msp501':
                logger.info("\n" + "=" * 70)
                logger.info("Running MSP 501 Scraper")
                logger.info("=" * 70)

                businesses = run_msp501_scraper(job_type)
                all_businesses.extend(businesses)

            elif source == 'reddit':
                logger.info("\n" + "=" * 70)
                logger.info("Running Reddit r/msp Scraper")
                logger.info("=" * 70)

                businesses = run_reddit_scraper(job_type)
                all_businesses.extend(businesses)

            else:
                logger.warning(f"Unknown source: {source}")

        # Process and save results
        logger.info("\n" + "=" * 70)
        logger.info("Processing and Saving Results")
        logger.info("=" * 70)

        processor = DataProcessor()
        stats = processor.process_and_save(all_businesses, scrape_job_id=job_id)

        # Update job record
        db = SessionLocal()
        job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
        job.mark_completed()
        job.businesses_found = len(all_businesses)
        job.businesses_new = stats['new']
        job.businesses_updated = stats['updated']
        job.total_items = len(cities)
        job.processed_items = len(cities)
        job.successful_items = len(cities)
        db.commit()
        db.close()

        # Print summary
        logger.info("\n" + "=" * 70)
        logger.info("SCRAPE COMPLETE - Summary")
        logger.info("=" * 70)
        logger.info(f"Sources: {', '.join(sources)}")
        logger.info(f"Cities searched: {len(cities)}")
        logger.info(f"Businesses found: {len(all_businesses)}")
        logger.info(f"New businesses: {stats['new']}")
        logger.info(f"Updated businesses: {stats['updated']}")
        logger.info(f"Skipped: {stats['skipped']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info("=" * 70)

        logger.success("✅ Scrape job completed successfully!")

        # Next steps
        logger.info("\nNext Steps:")
        logger.info("1. Check the database:")
        logger.info(f"   sqlite3 data/databases/msp_scraper.db 'SELECT COUNT(*) FROM businesses;'")
        logger.info("2. Export to CSV:")
        logger.info("   python scripts/export_data.py")
        logger.info("3. View specific businesses:")
        logger.info("   sqlite3 data/databases/msp_scraper.db 'SELECT name, city, phone FROM businesses LIMIT 10;'")

        return True

    except Exception as e:
        logger.error(f"Scrape job failed: {e}")
        import traceback
        logger.error(traceback.format_exc())

        # Mark job as failed
        db = SessionLocal()
        job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
        job.mark_failed(str(e))
        db.commit()
        db.close()

        return False


def run_yelp_scraper(cities: list, job_type: str) -> list:
    """
    Run Yelp API scraper.

    Args:
        cities: List of cities to search
        job_type: Job type

    Returns:
        List of business dictionaries
    """
    scraper = YelpScraper()

    # Determine max results per city
    if job_type == 'full':
        max_results = 50  # Get up to 50 per city
    elif job_type == 'incremental':
        max_results = 20  # Get 20 per city
    else:  # targeted
        max_results = 10  # Get 10 per city

    logger.info(f"Searching {len(cities)} cities (up to {max_results} results each)...")
    logger.info(f"Estimated businesses: {len(cities) * max_results}")
    logger.info(f"Estimated time: {(len(cities) * 2) / 60:.1f} minutes")

    businesses = scraper.scrape({
        'locations': cities,
        'search_term': 'managed service provider',
        'max_results_per_location': max_results,
    })

    stats = scraper.get_stats()
    logger.info(f"\nYelp Scraper Statistics:")
    logger.info(f"  API requests: {stats['requests']}")
    logger.info(f"  Successful: {stats['successes']}")
    logger.info(f"  Failed: {stats['failures']}")
    logger.info(f"  Businesses found: {stats['businesses_found']}")

    scraper.close()

    return businesses


def run_google_places_scraper(cities: list, job_type: str) -> list:
    """
    Run Google Places API scraper.

    Args:
        cities: List of cities to search
        job_type: Job type

    Returns:
        List of business dictionaries
    """
    try:
        scraper = GooglePlacesScraper()
    except ValueError as e:
        logger.warning(f"Skipping Google Places scraper: {e}")
        return []

    if job_type == 'full':
        max_results = 60
    elif job_type == 'incremental':
        max_results = 40
    else:
        max_results = 20

    logger.info(f"Searching {len(cities)} cities (up to {max_results} results each)...")

    businesses = scraper.scrape({
        'locations': cities,
        'max_results_per_location': max_results,
    })

    stats = scraper.get_stats()
    logger.info(f"\nGoogle Places Scraper Statistics:")
    logger.info(f"  API requests: {stats['requests']}")
    logger.info(f"  Successful: {stats['successes']}")
    logger.info(f"  Failed: {stats['failures']}")
    logger.info(f"  Businesses found: {stats['businesses_found']}")

    scraper.close()

    return businesses


def run_clutch_scraper(cities: list, job_type: str) -> list:
    """
    Run Clutch.co scraper (Selenium-based).

    Args:
        cities: List of cities to search
        job_type: Job type

    Returns:
        List of business dictionaries
    """
    try:
        scraper = ClutchScraper()
    except Exception as e:
        logger.warning(f"Skipping Clutch scraper: {e}")
        return []

    if job_type == 'full':
        max_pages = 5
        fetch_profiles = True
    elif job_type == 'incremental':
        max_pages = 3
        fetch_profiles = False
    else:
        max_pages = 2
        fetch_profiles = False

    # Clutch uses city names without state abbreviation
    clutch_locations = [city.split(',')[0].strip() for city in cities]

    logger.info(
        f"Searching {len(clutch_locations)} locations "
        f"(up to {max_pages} pages each)..."
    )

    businesses = scraper.scrape({
        'locations': clutch_locations,
        'max_pages_per_location': max_pages,
        'fetch_profiles': fetch_profiles,
    })

    stats = scraper.get_stats()
    logger.info(f"\nClutch Scraper Statistics:")
    logger.info(f"  Page loads: {stats['requests']}")
    logger.info(f"  Successful: {stats['successes']}")
    logger.info(f"  Failed: {stats['failures']}")
    logger.info(f"  Businesses found: {stats['businesses_found']}")

    scraper.close()

    return businesses


def run_msp501_scraper(job_type: str) -> list:
    """
    Run MSP 501 list scraper.
    Note: MSP 501 is a fixed list, not location-based.

    Args:
        job_type: Job type

    Returns:
        List of business dictionaries
    """
    scraper = MSP501Scraper()

    # Determine how many tier pages to scrape
    if job_type == 'full':
        max_pages = 10  # All tiers
    elif job_type == 'incremental':
        max_pages = 5  # Top 250
    else:
        max_pages = 2  # Top 100

    logger.info(f"Scraping MSP 501 list ({max_pages} tier pages)...")

    businesses = scraper.scrape({
        'max_pages': max_pages,
    })

    stats = scraper.get_stats()
    logger.info(f"\nMSP 501 Scraper Statistics:")
    logger.info(f"  Page fetches: {stats['requests']}")
    logger.info(f"  Successful: {stats['successes']}")
    logger.info(f"  Failed: {stats['failures']}")
    logger.info(f"  Businesses found: {stats['businesses_found']}")

    scraper.close()

    return businesses


def run_reddit_scraper(job_type: str) -> list:
    """
    Run Reddit r/msp scraper.
    Extracts MSP business mentions from posts, comments, and flairs.

    Args:
        job_type: Job type

    Returns:
        List of business dictionaries
    """
    try:
        scraper = RedditMSPScraper()
    except ValueError as e:
        logger.warning(f"Skipping Reddit scraper: {e}")
        return []

    if job_type == 'full':
        max_posts = 500
    elif job_type == 'incremental':
        max_posts = 200
    else:
        max_posts = 50

    logger.info(f"Scanning r/msp (up to {max_posts} posts)...")

    businesses = scraper.scrape({
        'max_posts': max_posts,
    })

    stats = scraper.get_stats()
    logger.info(f"\nReddit r/msp Scraper Statistics:")
    logger.info(f"  API requests: {stats['requests']}")
    logger.info(f"  Successful: {stats['successes']}")
    logger.info(f"  Failed: {stats['failures']}")
    logger.info(f"  Businesses found: {stats['businesses_found']}")

    scraper.close()

    return businesses


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Run MSP business scraper'
    )
    parser.add_argument(
        '--source', '--sources',
        nargs='+',
        default=['yelp'],
        choices=VALID_SOURCES,
        dest='sources',
        help='Data sources to scrape (default: yelp). '
             'Options: yelp, google, clutch, msp501, all'
    )
    parser.add_argument(
        '--job-type',
        choices=['full', 'incremental', 'targeted'],
        default='targeted',
        help='Type of scrape job (default: targeted - 5 cities for testing)'
    )
    parser.add_argument(
        '--max-cities',
        type=int,
        help='Maximum number of cities to search (for testing)'
    )

    args = parser.parse_args()

    # Run scrape
    success = run_scrape(
        sources=args.sources,
        job_type=args.job_type,
        max_cities=args.max_cities
    )

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
