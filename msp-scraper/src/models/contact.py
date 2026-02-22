"""
Contact model - represents individual contacts at MSP businesses.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship

from src.models.base import BaseModel


class Contact(BaseModel):
    """
    Represents a contact person at an MSP business.
    Typically owner, CEO, or other key decision-maker.
    """

    __tablename__ = 'contacts'

    # ============================================
    # Foreign Key
    # ============================================
    business_id = Column(
        Integer,
        ForeignKey('businesses.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # ============================================
    # Contact Information
    # ============================================
    full_name = Column(String(255))
    first_name = Column(String(100))
    last_name = Column(String(100))
    title = Column(String(255))  # e.g., "CEO", "Owner", "President"

    # ============================================
    # Contact Details
    # ============================================
    email = Column(String(255), index=True)
    phone = Column(String(50))
    linkedin_url = Column(String(500))

    # ============================================
    # Metadata
    # ============================================
    is_primary = Column(Boolean, default=False)  # Primary contact for business
    is_owner_ceo = Column(Boolean, default=False)  # Flag for owner/CEO
    data_quality_score = Column(Float, default=0.0)  # 0.0 - 1.0
    source = Column(String(100))  # Where this contact was found

    # Additional notes
    notes = Column(String(500))

    # ============================================
    # Relationship
    # ============================================
    business = relationship('Business', back_populates='contacts')

    # ============================================
    # Indexes
    # ============================================
    __table_args__ = (
        Index('idx_contact_business', 'business_id'),
        Index('idx_contact_email', 'email'),
        Index('idx_contact_owner', 'is_owner_ceo'),
        Index('idx_contact_primary', 'is_primary'),
    )

    def __repr__(self):
        return f"<Contact(id={self.id}, name='{self.full_name}', title='{self.title}')>"

    def to_dict(self):
        """Convert to dictionary."""
        data = super().to_dict()

        # Add business info if loaded
        if hasattr(self, 'business') and self.business:
            data['business'] = {
                'id': self.business.id,
                'name': self.business.name,
            }

        return data

    def is_leadership(self) -> bool:
        """
        Check if contact appears to be in leadership position.
        Based on title keywords.
        """
        if not self.title:
            return self.is_owner_ceo

        from src.config.constants import LEADERSHIP_TITLES

        title_lower = self.title.lower()
        return any(keyword in title_lower for keyword in LEADERSHIP_TITLES)

    def parse_name(self):
        """
        Parse full_name into first_name and last_name if not already set.
        """
        if self.full_name and not (self.first_name and self.last_name):
            parts = self.full_name.strip().split()
            if len(parts) >= 2:
                self.first_name = parts[0]
                self.last_name = parts[-1]
            elif len(parts) == 1:
                self.first_name = parts[0]
