"""
Business model - represents MSP companies.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, Text, Index
from sqlalchemy.orm import relationship

from src.models.base import BaseModel


class Business(BaseModel):
    """
    Represents an MSP business.
    Stores company information, location, and metadata.
    """

    __tablename__ = 'businesses'

    # ============================================
    # Business Information
    # ============================================
    name = Column(String(255), nullable=False, index=True)
    business_type = Column(String(100))  # e.g., "MSP", "IT Services"
    website = Column(String(500), unique=True, index=True)
    phone = Column(String(50), index=True)
    email = Column(String(255))

    # ============================================
    # Location
    # ============================================
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100), index=True)
    state_province = Column(String(100), index=True)
    postal_code = Column(String(20))
    country = Column(String(2), index=True)  # 'US' or 'CA'

    # ============================================
    # Company Size
    # ============================================
    employee_count = Column(Integer, index=True)
    employee_count_source = Column(String(100))  # Where we got this data
    employee_count_estimated = Column(Boolean, default=False)

    # ============================================
    # Data Quality & Verification
    # ============================================
    data_quality_score = Column(Float, default=0.0)  # 0.0 - 1.0
    verification_status = Column(
        String(50),
        default='unverified'
    )  # 'unverified', 'verified', 'invalid'

    # ============================================
    # Metadata
    # ============================================
    first_scraped_at = Column(String(100))  # ISO datetime string
    last_updated_at = Column(String(100))  # ISO datetime string
    is_active = Column(Boolean, default=True)

    # Additional notes/comments
    notes = Column(Text)

    # ============================================
    # Relationships
    # ============================================
    contacts = relationship(
        'Contact',
        back_populates='business',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    scrape_sources = relationship(
        'ScrapeSource',
        back_populates='business',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    # ============================================
    # Indexes
    # ============================================
    __table_args__ = (
        Index('idx_business_location', 'city', 'state_province', 'country'),
        Index('idx_business_employee_count', 'employee_count'),
        Index('idx_business_quality', 'data_quality_score'),
        Index('idx_business_active', 'is_active'),
    )

    def __repr__(self):
        return f"<Business(id={self.id}, name='{self.name}', city='{self.city}')>"

    def to_dict(self):
        """Convert to dictionary with related data."""
        data = super().to_dict()

        # Add contact count
        data['contact_count'] = self.contacts.count() if hasattr(self, 'contacts') else 0

        # Add primary owner/CEO contact if exists
        if hasattr(self, 'contacts'):
            owner = self.contacts.filter_by(is_owner_ceo=True).first()
            if owner:
                data['owner'] = {
                    'name': owner.full_name,
                    'title': owner.title,
                    'email': owner.email,
                    'phone': owner.phone,
                }

        return data

    def get_full_address(self) -> str:
        """Get formatted full address."""
        parts = [
            self.address_line1,
            self.address_line2,
            self.city,
            self.state_province,
            self.postal_code,
            self.country,
        ]
        return ', '.join([p for p in parts if p])

    def has_owner_contact(self) -> bool:
        """Check if business has an owner/CEO contact."""
        if hasattr(self, 'contacts'):
            return self.contacts.filter_by(is_owner_ceo=True).count() > 0
        return False

    def is_in_target_range(self) -> bool:
        """Check if employee count is in target range (3-50)."""
        if self.employee_count is None:
            return True  # Unknown, so don't filter out
        return 3 <= self.employee_count <= 50
