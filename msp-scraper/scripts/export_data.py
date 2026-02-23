#!/usr/bin/env python3
"""
Export business data to CSV.
Filters out non-MSP businesses (repair shops, phone stores, etc.)
and includes source info.
"""

import sys
import csv
import re
from pathlib import Path
from datetime import datetime

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config.logging_config import logger
from src.config.settings import settings
from src.models import Business, ScrapeSource, SessionLocal


# Categories that are NOT real MSPs — consumer repair / retail
NON_MSP_CATEGORIES = [
    'mobile phone repair',
    'mobile phone accessories',
    'mobile phones',
    'data recovery',
    'electronics repair',
    'computer repair',
    'home theatre installation',
    'tv mounting',
    'appliances',
    'camera repair',
    'screen printing',
    'printing services',
]

# Keywords in business_type that suggest an actual MSP / B2B IT company
MSP_POSITIVE_KEYWORDS = [
    'managed', 'msp', 'it services', 'consulting', 'cloud',
    'cybersecurity', 'network', 'telecom', 'voip', 'software',
    'security systems', 'web design', 'software development',
    'business consulting', 'internet service',
]

# Keywords in business name that suggest an actual MSP
MSP_NAME_KEYWORDS = [
    'managed', 'msp', 'it solutions', 'it services', 'tech solutions',
    'technology', 'networks', 'consulting', 'cyber', 'cloud',
    'infotech', 'datacom', 'netops',
]


def is_likely_msp(biz, sources: list) -> bool:
    """
    Determine if a business is likely a real MSP vs a repair shop.

    Returns True if it should be included in the export.
    """
    btype = (biz.business_type or '').lower()
    name = (biz.name or '').lower()
    source_set = set(sources)

    # Google Places results are pre-filtered by MSP search terms — keep them
    if 'google_places' in source_set:
        return True

    # MSP 501 and Reddit are curated/self-identified — keep them
    if 'msp501' in source_set or 'reddit_msp' in source_set:
        return True

    # Clutch is B2B directory — keep them
    if 'clutch' in source_set:
        return True

    # For Yelp: filter out obvious non-MSP categories
    if 'yelp_api' in source_set:
        # Reject if primary category is consumer repair/retail
        primary_cats = [c.strip() for c in btype.split(',')]

        # If the ONLY categories are non-MSP ones, reject
        non_msp_count = sum(
            1 for cat in primary_cats
            if any(bad in cat.lower() for bad in NON_MSP_CATEGORIES)
        )
        if non_msp_count == len(primary_cats) and len(primary_cats) > 0:
            return False

        # Keep if any positive MSP keyword in type or name
        if any(kw in btype for kw in MSP_POSITIVE_KEYWORDS):
            return True
        if any(kw in name for kw in MSP_NAME_KEYWORDS):
            return True

        # Keep if also found in another source (cross-validated)
        if len(source_set) > 1:
            return True

        # Reject Yelp-only businesses with generic "IT Services & Computer Repair"
        # unless name suggests MSP
        if 'computer repair' in btype and not any(kw in name for kw in MSP_NAME_KEYWORDS):
            return False

        # Default: keep with a note
        return True

    # Unknown source — keep
    return True


def export_to_csv(
    output_path: str = None,
    source_filter: str = None,
    include_all: bool = False,
):
    """
    Export MSP businesses to CSV, filtering out non-MSP repair shops.

    Args:
        output_path: Output file path
        source_filter: Optional source filter
        include_all: If True, skip MSP filtering (export everything)
    """
    if not output_path:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = str(settings.EXPORT_DIR / f'msp_businesses_{timestamp}.csv')

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()

    try:
        query = db.query(Business).filter(Business.is_active == True)

        if source_filter:
            query = query.join(Business.scrape_sources).filter(
                ScrapeSource.source_name == source_filter
            ).distinct()

        businesses = query.order_by(Business.name).all()

        # Build source lookup
        source_map = {}
        all_sources = db.query(ScrapeSource).all()
        for src in all_sources:
            source_map.setdefault(src.business_id, []).append(src.source_name)

        # Filter
        if not include_all:
            before = len(businesses)
            businesses = [
                biz for biz in businesses
                if is_likely_msp(biz, source_map.get(biz.id, []))
            ]
            filtered_out = before - len(businesses)
            logger.info(
                f"MSP filter: kept {len(businesses)}, "
                f"removed {filtered_out} non-MSP businesses"
            )

        logger.info(f"Exporting {len(businesses)} businesses to {output_path}")

        headers = [
            'name',
            'website',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'postal_code',
            'country',
            'business_type',
            'employee_count',
            'data_quality_score',
            'verification_status',
            'sources',
            'first_scraped',
            'last_updated',
        ]

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()

            for biz in businesses:
                sources = source_map.get(biz.id, [])

                writer.writerow({
                    'name': biz.name,
                    'website': biz.website,
                    'phone': biz.phone,
                    'email': biz.email,
                    'address': biz.get_full_address(),
                    'city': biz.city,
                    'state': biz.state_province,
                    'postal_code': biz.postal_code,
                    'country': biz.country,
                    'business_type': biz.business_type,
                    'employee_count': biz.employee_count,
                    'data_quality_score': biz.data_quality_score,
                    'verification_status': biz.verification_status,
                    'sources': ', '.join(set(sources)),
                    'first_scraped': biz.first_scraped_at,
                    'last_updated': biz.last_updated_at,
                })

        logger.success(f"Exported {len(businesses)} businesses to {output_path}")
        return output_path, len(businesses)

    finally:
        db.close()


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Export MSP businesses to CSV')
    parser.add_argument(
        '--output', '-o',
        help='Output CSV file path'
    )
    parser.add_argument(
        '--source', '-s',
        help='Filter by source (e.g., google_places, yelp_api, reddit_msp)'
    )
    parser.add_argument(
        '--all', action='store_true', dest='include_all',
        help='Include all businesses (skip MSP filtering)'
    )

    args = parser.parse_args()

    path, count = export_to_csv(
        output_path=args.output,
        source_filter=args.source,
        include_all=args.include_all,
    )

    print(f"\nExported {count} businesses to: {path}")


if __name__ == '__main__':
    main()
