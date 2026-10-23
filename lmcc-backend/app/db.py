import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

def get_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        clean_url = env_url.strip()
        # Normalize legacy 'postgres://' scheme to SQLAlchemy 'postgresql://'
        if clean_url.startswith("postgres://"):
            clean_url = re.sub(r"^postgres://", "postgresql://", clean_url, count=1)
        return clean_url
    # On Vercel / serverless runtimes without managed SQL, the function directory is read-only; /tmp is writable
    if os.getenv("VERCEL") == "1" or os.getenv("VERCEL_ENV") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return "sqlite:////tmp/reports.db"
    return "sqlite:///./reports.db"


DATABASE_URL = get_database_url()

# Configure engine kwargs based on dialect
engine_kwargs = {"echo": False}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
elif DATABASE_URL.startswith("postgresql"):
    # Resilient connection pooling for cloud PostgreSQL (Neon, Supabase, Render, AWS RDS)
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_initialized = False


def init_db():
    """Initializes the database schema if tables do not exist."""
    global _initialized
    if _initialized:
        return

    # Ensure all models are registered with Base.metadata before create_all
    import app.models.report  # noqa: F401

    # Ensure parent directory exists for SQLite files (e.g. ./data/reports.db or /tmp/reports.db)
    if DATABASE_URL.startswith("sqlite:///"):
        raw_path = DATABASE_URL.replace("sqlite:///", "")
        dir_name = os.path.dirname(raw_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

    Base.metadata.create_all(bind=engine)

    # Auto-migrate SQLite schema if new columns were added to model
    if DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                result = conn.execute(text("PRAGMA table_info(reports)"))
                columns = [row[1] for row in result.fetchall()]
                if "local_report_id" not in columns:
                    conn.execute(text("ALTER TABLE reports ADD COLUMN local_report_id VARCHAR"))
                    conn.commit()
            except Exception:
                pass
    _initialized = True


def get_db():
    """FastAPI dependency to yield a database session."""
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ensure tables are initialized when module is loaded in serverless environments
init_db()


