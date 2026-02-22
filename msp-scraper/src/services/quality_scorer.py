"""
Data quality scoring service.
Calculates quality score (0-1) based on data completeness and reliability.
"""

from typing import Dict, Any
from src.config.logging_config import logger


class QualityScorer:
    """
    Score business data quality based on completeness and reliability.
    Score ranges from 0.0 (poor) to 1.0 (excellent).
    """

    def score_business(self, business_data: Dict[str, Any]) -> float:
        """
        Calculate quality score for business data.

        Args:
            business_data: Business data dictionary

        Returns:
            Quality score between 0.0 and 1.0
        """
        score = 0.0
        max_score = 0.0

        # Required fields (baseline)
        if business_data.get('name'):
            score += 10
        max_score += 10

        # Contact information (high value)
        if business_data.get('website'):
            score += 20
        max_score += 20

        if business_data.get('phone'):
            score += 15
        max_score += 15

        if business_data.get('email'):
            score += 15
        max_score += 15

        # Address information
        if business_data.get('address_line1'):
            score += 5
        max_score += 5

        if business_data.get('city') and business_data.get('state_province'):
            score += 5
        max_score += 5

        # Employee count (critical for filtering)
        if business_data.get('employee_count'):
            score += 15
            # Bonus if from reliable source
            reliable_sources = ['clutch', 'linkedin', 'company_website']
            if business_data.get('employee_count_source') in reliable_sources:
                score += 5
        max_score += 20

        # Owner/CEO contact (highest value) - not available yet
        # This will be scored when we add contact extraction
        max_score += 15

        # Normalize to 0-1
        final_score = score / max_score if max_score > 0 else 0.0

        logger.debug(
            f"Quality score for {business_data.get('name')}: "
            f"{final_score:.2f} ({score}/{max_score})"
        )

        return round(final_score, 2)

    def score_contact(self, contact_data: Dict[str, Any]) -> float:
        """
        Calculate quality score for contact data.

        Args:
            contact_data: Contact data dictionary

        Returns:
            Quality score between 0.0 and 1.0
        """
        score = 0.0
        max_score = 0.0

        # Name
        if contact_data.get('full_name'):
            score += 20
        max_score += 20

        # Title
        if contact_data.get('title'):
            score += 15
            # Bonus for leadership title
            if contact_data.get('is_owner_ceo'):
                score += 10
        max_score += 25

        # Email
        if contact_data.get('email'):
            score += 25
        max_score += 25

        # Phone
        if contact_data.get('phone'):
            score += 15
        max_score += 15

        # LinkedIn
        if contact_data.get('linkedin_url'):
            score += 15
        max_score += 15

        # Normalize to 0-1
        final_score = score / max_score if max_score > 0 else 0.0

        return round(final_score, 2)
