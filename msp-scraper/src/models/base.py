"""
SQLAlchemy base model and database session management.
"""

from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import Column, Integer, DateTime

from src.config.settings import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.SQLALCHEMY_ECHO,
    pool_pre_ping=True,  # Verify connections before using
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create base class for models
Base = declarative_base()


class BaseModel(Base):
    """
    Abstract base model with common fields and methods.
    All models should inherit from this.
    """

    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    def to_dict(self):
        """
        Convert model instance to dictionary.
        Useful for serialization and API responses.
        """
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            # Convert datetime to ISO format
            if isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result

    def __repr__(self):
        """String representation of model."""
        return f"<{self.__class__.__name__}(id={self.id})>"


def get_db() -> Session:
    """
    Get database session.
    Use with context manager or remember to close.

    Example:
        db = get_db()
        try:
            # Use db
            db.query(Business).all()
        finally:
            db.close()

    Or with context manager:
        with get_db() as db:
            # Use db
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    Creates all tables defined in models.
    """
    # Import all models to ensure they're registered
    from src.models import business, contact, scrape_job, scrape_source

    # Create all tables
    Base.metadata.create_all(bind=engine)
