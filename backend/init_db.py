import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import init_db_schema, SessionLocal
from app.seed_data import seed_demo_data


if __name__ == "__main__":
    print("[+] Initializing RoadWatch database...")
    init_db_schema()
    db = SessionLocal()
    try:
        seed_demo_data(db)
        print("[+] Database initialization complete.")
    finally:
        db.close()
