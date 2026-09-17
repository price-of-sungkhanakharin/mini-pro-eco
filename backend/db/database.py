"""Database connection setup and session management."""

from sqlalchemy import create_engine
try:
    from sqlalchemy.orm import declarative_base, sessionmaker
except ImportError:
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker

from backend.app.core.config import settings

SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
    f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency generator for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
