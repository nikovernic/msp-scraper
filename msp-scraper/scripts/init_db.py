#!/usr/bin/env python3
"""
Database initialization script.
Creates all tables and optionally seeds with sample data.
"""

import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config.logging_config import logger
from src.config.settings import settings
from src.models import init_db, Business, Contact, ScrapeJob, SessionLocal


def create_tables():
    """Create all database tables."""
    logger.info("Creating database tables...")

    try:
        # Ensure database directory exists
        settings.DATABASE_DIR.mkdir(parents=True, exist_ok=True)

        # Initialize database (create all tables)
        init_db()

        logger.success("Database tables created successfully!")
        logger.info(f"Database location: {settings.DATABASE_URL}")

        # Verify tables were created
        db = SessionLocal()
        try:
            business_count = db.query(Business).count()
            contact_count = db.query(Contact).count()
            job_count = db.query(ScrapeJob).count()

            logger.info(f"Current database stats:")
            logger.info(f"  - Businesses: {business_count}")
            logger.info(f"  - Contacts: {contact_count}")
            logger.info(f"  - Scrape Jobs: {job_count}")

        finally:
            db.close()

        return True

    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        return False


def seed_sample_data():
    """Seed database with sample data for testing."""
    logger.info("Seeding sample data...")

    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(Business).count() > 0:
            logger.warning("Database already contains data. Skipping seed.")
            return

        # Create sample businesses
        sample_businesses = [
            Business(
                name="TechPro Solutions",
                business_type="MSP",
                website="https://techprosolutions.example.com",
                phone="+1-555-0101",
                email="info@techprosolutions.example.com",
                address_line1="123 Tech Street",
                city="San Francisco",
                state_province="CA",
                postal_code="94102",
                country="US",
                employee_count=15,
                employee_count_source="manual",
                data_quality_score=0.8,
            ),
            Business(
                name="Managed IT Services Inc",
                business_type="IT Services",
                website="https://managedservices.example.com",
                phone="+1-555-0102",
                city="Toronto",
                state_province="ON",
                postal_code="M5H 2N2",
                country="CA",
                employee_count=25,
                employee_count_source="manual",
                data_quality_score=0.6,
            ),
        ]

        for business in sample_businesses:
            db.add(business)

        db.commit()

        # Create sample contacts for first business
        ceo_contact = Contact(
            business_id=sample_businesses[0].id,
            full_name="John Smith",
            first_name="John",
            last_name="Smith",
            title="CEO",
            email="john.smith@techprosolutions.example.com",
            phone="+1-555-0101",
            is_primary=True,
            is_owner_ceo=True,
            data_quality_score=0.9,
            source="manual",
        )

        db.add(ceo_contact)
        db.commit()

        logger.success(f"Seeded {len(sample_businesses)} sample businesses")
        logger.success(f"Seeded 1 sample contact")

    except Exception as e:
        logger.error(f"Failed to seed sample data: {e}")
        db.rollback()

    finally:
        db.close()


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Initialize MSP scraper database"
    )
    parser.add_argument(
        '--seed',
        action='store_true',
        help='Seed database with sample data for testing'
    )
    parser.add_argument(
        '--reset',
        action='store_true',
        help='WARNING: Drop all tables and recreate (data will be lost!)'
    )

    args = parser.parse_args()

    if args.reset:
        logger.warning("RESET mode: This will delete all existing data!")
        response = input("Are you sure you want to continue? (yes/no): ")

        if response.lower() != 'yes':
            logger.info("Reset cancelled")
            return

        from src.models.base import Base, engine
        logger.warning("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        logger.success("All tables dropped")

    # Create tables
    success = create_tables()

    if not success:
        sys.exit(1)

    # Seed sample data if requested
    if args.seed:
        seed_sample_data()

    logger.success("Database initialization complete!")


if __name__ == '__main__':
    main()
