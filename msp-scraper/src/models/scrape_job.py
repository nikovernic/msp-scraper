"""
ScrapeJob model - tracks scraping job execution and results.
"""

from sqlalchemy import Column, String, Integer, Text, JSON
from sqlalchemy.orm import relationship

from src.models.base import BaseModel


class ScrapeJob(BaseModel):
    """
    Represents a scraping job execution.
    Tracks progress, results, and errors.
    """

    __tablename__ = 'scrape_jobs'

    # ============================================
    # Job Information
    # ============================================
    job_type = Column(String(50), nullable=False, index=True)
    # 'full', 'incremental', 'targeted'

    data_source = Column(String(100), index=True)
    # e.g., 'yellowpages', 'yelp', 'clutch', 'all'

    status = Column(String(50), default='pending', nullable=False, index=True)
    # 'pending', 'running', 'completed', 'failed'

    # ============================================
    # Progress Tracking
    # ============================================
    total_items = Column(Integer, default=0)
    processed_items = Column(Integer, default=0)
    successful_items = Column(Integer, default=0)
    failed_items = Column(Integer, default=0)

    # ============================================
    # Timing
    # ============================================
    started_at = Column(String(100))  # ISO datetime string
    completed_at = Column(String(100))  # ISO datetime string
    duration_seconds = Column(Integer)

    # ============================================
    # Results
    # ============================================
    businesses_found = Column(Integer, default=0)
    businesses_new = Column(Integer, default=0)
    businesses_updated = Column(Integer, default=0)

    # ============================================
    # Error Tracking
    # ============================================
    error_message = Column(Text)
    error_count = Column(Integer, default=0)

    # ============================================
    # Configuration
    # ============================================
    config_json = Column(JSON)  # Store job-specific config

    # ============================================
    # Relationships
    # ============================================
    sources = relationship(
        'ScrapeSource',
        back_populates='scrape_job',
        lazy='dynamic'
    )

    def __repr__(self):
        return f"<ScrapeJob(id={self.id}, type='{self.job_type}', status='{self.status}')>"

    def to_dict(self):
        """Convert to dictionary with additional stats."""
        data = super().to_dict()

        # Calculate success rate
        if self.processed_items > 0:
            data['success_rate'] = self.successful_items / self.processed_items
        else:
            data['success_rate'] = 0.0

        # Add progress percentage
        if self.total_items > 0:
            data['progress_percentage'] = (self.processed_items / self.total_items) * 100
        else:
            data['progress_percentage'] = 0.0

        return data

    def mark_started(self):
        """Mark job as started."""
        from datetime import datetime
        self.status = 'running'
        self.started_at = datetime.utcnow().isoformat()

    def mark_completed(self):
        """Mark job as completed and calculate duration."""
        from datetime import datetime
        self.status = 'completed'
        self.completed_at = datetime.utcnow().isoformat()

        if self.started_at:
            start = datetime.fromisoformat(self.started_at)
            end = datetime.fromisoformat(self.completed_at)
            self.duration_seconds = int((end - start).total_seconds())

    def mark_failed(self, error_message: str):
        """Mark job as failed with error message."""
        from datetime import datetime
        self.status = 'failed'
        self.completed_at = datetime.utcnow().isoformat()
        self.error_message = error_message

        if self.started_at:
            start = datetime.fromisoformat(self.started_at)
            end = datetime.fromisoformat(self.completed_at)
            self.duration_seconds = int((end - start).total_seconds())

    def increment_processed(self, success: bool = True):
        """Increment processed count."""
        self.processed_items += 1
        if success:
            self.successful_items += 1
        else:
            self.failed_items += 1

    def get_summary(self) -> str:
        """Get human-readable summary of job."""
        return (
            f"Job #{self.id}: {self.job_type} scrape from {self.data_source}\n"
            f"Status: {self.status}\n"
            f"Processed: {self.processed_items}/{self.total_items}\n"
            f"Found: {self.businesses_found} businesses "
            f"({self.businesses_new} new, {self.businesses_updated} updated)\n"
            f"Duration: {self.duration_seconds}s"
        )
