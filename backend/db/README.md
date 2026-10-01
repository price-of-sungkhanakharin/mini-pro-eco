# Database Persistence Engine (`backend/db/`)

The `db` directory manages database connectivity, session pooling, and ORM initialization for PostgreSQL 17.

---

## Database Session Lifecycle (`database.py`)

- **Engine Initialization:** Initializes SQLAlchemy engine (`create_engine`) configured with connection pooling (`pool_pre_ping=True`).
- **Session Local:** Creates `sessionmaker(autocommit=False, autoflush=False, bind=engine)`.
- **Declarative Base:** Provides `Base = declarative_base()` inherited by all model entities.
- **Session Dependency (`get_db`):** Generator function used in FastAPI routes to manage per-request database sessions with automatic closing (`try ... finally db.close()`).
