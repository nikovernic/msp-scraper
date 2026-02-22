"""
ScrapeSource model - tracks where business data came from.
"""

from sqlalchemy import Column, String, Integer, ForeignKey, JSON, Index, UniqueConstraint
from sqlalchemy.orm import relationship

from src.models.base import BaseModel


class ScrapeSource(BaseModel):
    """
    Represents the source of business data.
    Tracks which scraping job found which business from which URL.
    """

    __tablename__ = 'scrape_sources'

    # ============================================
    # Foreign Keys
    # ============================================
    business_id = Column(
        Integer,
        ForeignKey('businesses.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    scrape_job_id = Column(
        Integer,
        ForeignKey('scrape_jobs.id', ondelete='SET NULL'),
        index=True
    )

    # ============================================
    # Source Information
    # ============================================
    source_name = Column(String(100), nullable=False, index=True)
    # e.g., 'yellowpages', 'yelp', 'clutch', 'company_website'

    source_url = Column(String(1000))  # URL where data was found
    source_id = Column(String(255))  # External ID if available (e.g., Yelp business ID)

    # ============================================
    # Data Tracking
    # ============================================
    raw_data_json = Column(JSON)  # Store original scraped data
    scraped_at = Column(String(100))  # ISO datetime string

    # ============================================
    # Relationships
    # ============================================
    business = relationship('Business', back_populates='scrape_sources')
    scrape_job = relationship('ScrapeJob', back_populates='sources')

    # ============================================
    # Indexes and Constraints
    # ============================================
    __table_args__ = (
        Index('idx_source_business', 'business_id'),
        Index('idx_source_name', 'source_name'),
        Index('idx_source_job', 'scrape_job_id'),
        Index('idx_source_url', 'source_url', mysql_length=255),  # For MySQL compatibility
        # Prevent duplicate sources for same business
        UniqueConstraint(
            'business_id',
            'source_name',
            'source_url',
            name='uq_business_source'
        ),
    )

    def __repr__(self):
        return f"<ScrapeSource(id={self.id}, source='{self.source_name}', business_id={self.business_id})>"

    def to_dict(self):
        """Convert to dictionary."""
        data = super().to_dict()

        # Add business info if loaded
        if hasattr(self, 'business') and self.business:
            data['business'] = {
                'id': self.business.id,
                'name': self.business.name,
            }

        # Add job info if loaded
        if hasattr(self, 'scrape_job') and self.scrape_job:
            data['scrape_job'] = {
                'id': self.scrape_job.id,
                'type': self.scrape_job.job_type,
                'status': self.scrape_job.status,
            }

        return data
