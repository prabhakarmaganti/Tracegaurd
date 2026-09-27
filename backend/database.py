import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

import shutil

# Database connection configuration
# Supports external DATABASE_URL (PostgreSQL, MySQL, etc.) or SQLite.
# In serverless environments like Vercel, the root file system is read-only, so SQLite must use /tmp.
raw_db_url = os.environ.get("DATABASE_URL")

if raw_db_url:
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(raw_db_url)
else:
    is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
    default_sqlite_path = "/tmp/traceguard.db" if is_serverless else "db/traceguard.db"
    DB_PATH = os.environ.get("TRACEGUARD_DB_PATH", default_sqlite_path)

    # In serverless environments, if using /tmp and file does not exist, copy existing pre-seeded db if available
    if is_serverless and DB_PATH.startswith("/tmp") and not os.path.exists(DB_PATH):
        for candidate in ["db/traceguard.db"]:
            if os.path.isfile(candidate):
                try:
                    shutil.copy2(candidate, DB_PATH)
                    break
                except Exception:
                    pass

    # Ensure data directory exists if path has directory components
    dir_name = os.path.dirname(DB_PATH)
    if dir_name:
        try:
            os.makedirs(dir_name, exist_ok=True)
        except OSError:
            DB_PATH = f"/tmp/{os.path.basename(DB_PATH)}"

    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

    # Enable WAL mode and foreign key enforcement on SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
