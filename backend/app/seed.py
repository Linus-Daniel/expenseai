import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User, Transaction, TransactionType
from app.services.auth_service import hash_password
from app.config import get_settings

settings = get_settings()


def seed():
    print("Seeding database...")

    # Use sync driver for seeding
    sync_url = settings.DATABASE_URL_SYNC
    engine = create_engine(sync_url, echo=False)

    # Recreate tables
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print("Tables created.")

    Session = sessionmaker(bind=engine)
    session = Session()

    # Demo user
    user = User(
        email="demo@expenseai.com",
        hashed_password=hash_password("demo1234"),
        full_name="Demo User",
        monthly_income=5500.0,
        monthly_savings_goal=1100.0,
        risk_tolerance="moderate",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    print(f"Created demo user: {user.email} (password: demo1234)")

    # Sample transactions
    sample_txns = [
        ("PAYROLL DIRECT DEP", "Salary deposit", 5500.00, "income", "Salary/Income"),
        ("WHOLE FOODS MKT", "Weekly groceries", 127.40, "expense", "Groceries"),
        ("STARBUCKS #12457", "Morning coffee", 5.50, "expense", "Food & Dining"),
        ("AMAZON.COM", "Online order", 89.99, "expense", "Shopping"),
        ("UBER TRIP", "Ride to office", 24.00, "expense", "Transportation"),
        ("NETFLIX.COM", "Monthly subscription", 15.99, "expense", "Entertainment"),
        ("AT&T WIRELESS", "Phone bill", 85.00, "expense", "Utilities & Bills"),
        ("CHIPOTLE ONLINE", "Lunch order", 12.50, "expense", "Food & Dining"),
        ("TRADER JOE'S #47", "Groceries", 65.30, "expense", "Groceries"),
        ("SPOTIFY PREMIUM", "Music subscription", 9.99, "expense", "Entertainment"),
        ("CVS PHARMACY", "Prescription", 22.00, "expense", "Healthcare"),
        ("TARGET #3847", "Household items", 54.99, "expense", "Shopping"),
        ("SAFEWAY STORE", "Weekly groceries", 88.20, "expense", "Groceries"),
        ("COMCAST XFINITY", "Internet bill", 79.99, "expense", "Utilities & Bills"),
        ("PAYROLL DIRECT DEP", "Biweekly salary", 5500.00, "income", "Salary/Income"),
    ]

    from datetime import datetime, timedelta
    import uuid

    for i, (merchant, desc, amount, txn_type, category) in enumerate(sample_txns):
        tx = Transaction(
            user_id=user.id,
            amount=amount,
            transaction_type=TransactionType(txn_type),
            description=desc,
            merchant=merchant,
            category=category,
            predicted_category=category,
            transaction_date=datetime.now(tz=None) - timedelta(days=i * 2),
        )
        session.add(tx)

    session.commit()
    print(f"Seeded {len(sample_txns)} transactions")
    session.close()
    engine.dispose()
    print("Done!")


if __name__ == "__main__":
    seed()
