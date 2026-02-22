"""
Data processing service.
Validates, processes, and saves scraped business data to database.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

from src.config.logging_config import logger
from src.models import Business, ScrapeSource, SessionLocal
from src.services.quality_scorer import QualityScorer
from src.utils.validators import normalize_phone, normalize_url, validate_email


class DataProcessor:
    """
    Processes scraped data: validation, normalization, and database storage.
    """

    def __init__(self):
        """Initialize data processor."""
        self.quality_scorer = QualityScorer()
        self.logger = logger

        # Statistics
        self.stats = {
            'processed': 0,
            'new': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0,
        }

    def process_and_save(
        self,
        businesses: List[Dict[str, Any]],
        scrape_job_id: Optional[int] = None
    ) -> Dict[str, int]:
        """
        Process and save businesses to database.

        Args:
            businesses: List of business data dictionaries
            scrape_job_id: Optional ID of scrape job

        Returns:
            Statistics dictionary
        """
        self.logger.info(f"Processing {len(businesses)} businesses...")

        db = SessionLocal()

        try:
            for i, business_data in enumerate(businesses):
                try:
                    # Use savepoint so a single failure doesn't poison the session
                    nested = db.begin_nested()
                    self._process_business(db, business_data, scrape_job_id)
                    nested.commit()
                    self.stats['processed'] += 1

                except Exception as e:
                    nested.rollback()
                    self.logger.error(f"Error processing business: {e}")
                    self.stats['errors'] += 1
                    continue

                # Commit in batches of 100 to avoid huge transactions
                if (i + 1) % 100 == 0:
                    db.commit()
                    self.logger.info(f"Committed batch: {i + 1}/{len(businesses)}")

            # Final commit
            db.commit()

            self.logger.info(
                f"Processing complete: {self.stats['new']} new, "
                f"{self.stats['updated']} updated, "
                f"{self.stats['skipped']} skipped, "
                f"{self.stats['errors']} errors"
            )

            return self.stats

        except Exception as e:
            db.rollback()
            self.logger.error(f"Database error: {e}")
            raise

        finally:
            db.close()

    def _process_business(
        self,
        db,
        business_data: Dict[str, Any],
        scrape_job_id: Optional[int]
    ):
        """
        Process a single business.

        Args:
            db: Database session
            business_data: Business data dictionary
            scrape_job_id: Optional scrape job ID
        """
        # Validate
        if not self._validate_business(business_data):
            self.stats['skipped'] += 1
            return

        # Normalize
        normalized = self._normalize_business(business_data)

        # Check for existing business
        existing = self._find_existing(db, normalized)

        if existing:
            # Update existing
            self._update_business(existing, normalized)
            business = existing
            self.stats['updated'] += 1
            self.logger.debug(f"Updated: {business.name}")

        else:
            # Create new
            business = self._create_business(normalized)
            db.add(business)
            db.flush()  # Get ID
            self.stats['new'] += 1
            self.logger.debug(f"Created: {business.name}")

        # Create scrape source record
        self._create_source(db, business.id, business_data, scrape_job_id)

    def _validate_business(self, data: Dict[str, Any]) -> bool:
        """
        Validate business data has required fields.

        Args:
            data: Business data dictionary

        Returns:
            True if valid, False otherwise
        """
        # Must have name
        if not data.get('name'):
            self.logger.warning("Skipping business without name")
            return False

        # Must have at least one contact method
        has_contact = any([
            data.get('phone'),
            data.get('email'),
            data.get('website')
        ])

        if not has_contact:
            self.logger.warning(
                f"Skipping {data.get('name')}: no contact information"
            )
            return False

        return True

    def _normalize_business(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize and clean business data.

        Args:
            data: Raw business data

        Returns:
            Normalized data dictionary
        """
        normalized = data.copy()

        # Normalize phone
        if normalized.get('phone'):
            normalized['phone'] = normalize_phone(normalized['phone'])

        # Normalize website URL
        if normalized.get('website'):
            normalized['website'] = normalize_url(normalized['website'])

        # Normalize email
        if normalized.get('email'):
            email = normalized['email'].strip().lower()
            if validate_email(email):
                normalized['email'] = email
            else:
                normalized['email'] = None

        # Calculate quality score
        normalized['data_quality_score'] = self.quality_scorer.score_business(
            normalized
        )

        # Set timestamps
        now = datetime.utcnow().isoformat()
        if not normalized.get('first_scraped_at'):
            normalized['first_scraped_at'] = now
        normalized['last_updated_at'] = now

        return normalized

    def _find_existing(self, db, data: Dict[str, Any]) -> Optional[Business]:
        """
        Find existing business in database.

        Args:
            db: Database session
            data: Business data dictionary

        Returns:
            Existing Business or None
        """
        # Check by website (most reliable)
        if data.get('website'):
            existing = db.query(Business).filter(
                Business.website == data['website']
            ).first()
            if existing:
                return existing

        # Check by phone
        if data.get('phone'):
            existing = db.query(Business).filter(
                Business.phone == data['phone']
            ).first()
            if existing:
                return existing

        # Check by name + city (fuzzy match could be added later)
        if data.get('name') and data.get('city'):
            existing = db.query(Business).filter(
                Business.name == data['name'],
                Business.city == data['city'],
                Business.state_province == data.get('state_province')
            ).first()
            if existing:
                return existing

        return None

    def _create_business(self, data: Dict[str, Any]) -> Business:
        """
        Create new Business instance.

        Args:
            data: Normalized business data

        Returns:
            Business instance
        """
        return Business(
            name=data.get('name'),
            business_type=data.get('business_type'),
            website=data.get('website'),
            phone=data.get('phone'),
            email=data.get('email'),
            address_line1=data.get('address_line1'),
            address_line2=data.get('address_line2'),
            city=data.get('city'),
            state_province=data.get('state_province'),
            postal_code=data.get('postal_code'),
            country=data.get('country', 'US'),
            employee_count=data.get('employee_count'),
            employee_count_source=data.get('employee_count_source'),
            employee_count_estimated=data.get('employee_count_estimated', False),
            data_quality_score=data.get('data_quality_score', 0.0),
            verification_status='unverified',
            first_scraped_at=data.get('first_scraped_at'),
            last_updated_at=data.get('last_updated_at'),
            is_active=True,
        )

    def _update_business(self, business: Business, data: Dict[str, Any]):
        """
        Update existing business with new data.

        Args:
            business: Existing Business instance
            data: New business data
        """
        # Update fields if new data is more complete
        if data.get('website') and not business.website:
            business.website = data['website']

        if data.get('email') and not business.email:
            business.email = data['email']

        if data.get('phone') and not business.phone:
            business.phone = data['phone']

        if data.get('employee_count') and not business.employee_count:
            business.employee_count = data['employee_count']
            business.employee_count_source = data.get('employee_count_source')

        # Always update timestamp and quality score
        business.last_updated_at = data.get('last_updated_at')
        business.data_quality_score = max(
            business.data_quality_score or 0,
            data.get('data_quality_score', 0)
        )

    def _create_source(
        self,
        db,
        business_id: int,
        data: Dict[str, Any],
        scrape_job_id: Optional[int]
    ):
        """
        Create or update scrape source record.

        Args:
            db: Database session
            business_id: Business ID
            data: Business data with source info
            scrape_job_id: Optional scrape job ID
        """
        source_name = data.get('source', 'unknown')
        source_url = data.get('source_url')

        # Check if this source already exists for this business
        existing = db.query(ScrapeSource).filter(
            ScrapeSource.business_id == business_id,
            ScrapeSource.source_name == source_name,
            ScrapeSource.source_url == source_url,
        ).first()

        if existing:
            # Update existing source record
            existing.scrape_job_id = scrape_job_id
            existing.raw_data_json = data.get('raw_data')
            existing.scraped_at = datetime.utcnow().isoformat()
        else:
            source = ScrapeSource(
                business_id=business_id,
                scrape_job_id=scrape_job_id,
                source_name=source_name,
                source_url=source_url,
                source_id=data.get('source_id'),
                raw_data_json=data.get('raw_data'),
                scraped_at=datetime.utcnow().isoformat(),
            )
            db.add(source)

    def get_stats(self) -> Dict[str, int]:
        """Get processing statistics."""
        return self.stats.copy()

    def reset_stats(self):
        """Reset statistics."""
        self.stats = {
            'processed': 0,
            'new': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0,
        }
