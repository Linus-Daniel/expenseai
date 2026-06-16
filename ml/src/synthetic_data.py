"""
Synthetic data generator for the ExpenseAI system.
Generates realistic transaction data for training ML models.
Works as a standalone script AND can be imported from notebooks.
"""
import os
import random
import uuid
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd
import numpy as np

try:
    _SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    _SCRIPT_DIR = "."  # notebook fallback

np.random.seed(42)
random.seed(42)

CATEGORIES = {
    "Food & Dining": {
        "weight": 0.18,
        "merchants": [
            "CHIPOTLE ONLINE", "DOORDASH", "GRUBHUB", "UBER EATS",
            "STARBUCKS #12457", "MCDONALD'S F3849", "DUNKIN #88432",
            "CHICK-FIL-A #3847", "TACO BELL #2948", "WHOLE FOODS MKT",
            "TRADER JOE'S #47", "SAFEWAY STORE #1847", "KROGER #384",
            "COSTCO GAS", "PUBLIX #3847", "WALMART GROCERY",
            "LOCAL PIZZA JOINT", "MAMA'S KITCHEN REST", "SUSHI PALACE",
            "BBQ SMOKEHOUSE 42", "BURGER KING #2837", "WENDY'S #1847",
            "PANERA BREAD #2948", "APPLEBEE'S #3847", "OLIVE GARDEN",
            "RED LOBSTER #3847", "CHEESECAKE FACTORY", "IHOP #3847",
            "Waffle House #847", "Denny's #3847", "Subway #49382",
        ],
        "price_range": (5, 80),
    },
    "Transportation": {
        "weight": 0.14,
        "merchants": [
            "UBER TRIP", "LYFT RIDE", "MTA MetroCard", "NJ Transit",
            "AMTRAK Auto Train", "PARK 'N FLY", "SHELL OIL 47", "CHEVRON #3847",
            "EXXONMOBIL 3847", "BP CONNECT #384", "VALERO #3847",
            "AIRTAG CAR RENTAL", "ENTERPRISE RENT-A-CAR", "HERTZ #3847",
            "TOLL ROAD #3847", "E-ZPASS REPLENISH", "NYC PARKING METER",
            "BART Clipper", "CTA Bus Pass", "Metropark Parking",
        ],
        "price_range": (3, 120),
    },
    "Shopping": {
        "weight": 0.16,
        "merchants": [
            "AMAZON.COM*MXT29", "AMAZON PRIME*RTX849", "TARGET #3847",
            "WALMART #3847", "BEST BUY #3847", "APPLE.COM/BILL",
            "NORDSTROM #3847", "MACY'S #3847", "NIKE.COM",
            "ADIDAS ONLINE", "EBAY*PRODLISTING", "ETSYSHOPIFY",
            "COSTCO WHSE #3847", "IKEA HOME GOODS", "HOME DEPOT #3847",
            "LOWES #3847", "WILLIAMS SONOMA", "Bed Bath&Beyond #3847",
            "KOHL'S #3847", "JCPENNEY #3847", "SEPHORA #3847",
            "ULTA BEAUTY #3847", "CVS PHARMACY #3847", "WALGREENS #3847",
        ],
        "price_range": (10, 500),
    },
    "Entertainment": {
        "weight": 0.08,
        "merchants": [
            "NETFLIX.COM", "SPOTIFY PREMIUM", "APPLE MUSIC",
            "HBO MAX SUBSCRIPTION", "DISNEY+ BILLED", "HULU LLC",
            "AMC THEATRES #3847", "REGAL CINEMAS #3847",
            "EVENTBRITE*CONCERT", "TICKETMASTER*CONCERT", "LIVE NATION",
            "STEAM GAMES PURCH", "XBOX LIVE GOLD", "PLAYSTATION STORE",
            "Nintendo eShop", "AMC LOYALTY PAY", "CINEMARK #3847",
            "ALAMO DRAFTHOUSE", "DICE.FM CONCERT", "VIVID SEATS",
        ],
        "price_range": (5, 200),
    },
    "Healthcare": {
        "weight": 0.07,
        "merchants": [
            "CVS PHARMACY #3847", "WALGREENS #3847", "RITE AID #3847",
            "URBAN HEALTH CLINIC", "DR. SMITH MD OFFICE", "CITY DENTAL GROUP",
            "QUEST DIAGNOSTICS", "LABCORP #3847", "PLANNED PARENTHOOD",
            "ONE MEDICAL GROUP", "HIMS/HERS HEALTH", "COSTCO PHARMACY #3847",
            "CONCISE CHIRO CLINIC", "WALGREENS PHARMACY", "GOODRX RX DISCOUNT",
        ],
        "price_range": (10, 300),
    },
    "Utilities & Bills": {
        "weight": 0.12,
        "merchants": [
            "AT&T WIRELESS", "VERIZON WIRELESS", "T-MOBILE USA",
            "COMCAST XFINITY", "SPECTRUM INTERNET", "CON EDISON",
            "PG&E BILL PAY", "WATER UTILITY CITY", "INTERNET COMCAST",
            "ZOOM PRO SUBSCRIPTION", "MSFT *OFFICE 365", "GOOGLE ONE STORAGE",
            "ICLOUD STORAGE", "DROPBOX PRO", "AMAZON PRIME MEMBERSHIP",
            "NEST THERMOSTAT", "RING HOME SEC", "ADT SECURE HOME",
        ],
        "price_range": (20, 250),
    },
    "Travel": {
        "weight": 0.06,
        "merchants": [
            "EXPEDIA HOTELS", "BOOKING.COM RESV", "AIRBNB HOST",
            "DELTA AIR LINES", "UNITED AIRLINES", "AMERICAN AIRLINES",
            "SOUTHWEST AIR", "JETBLUE AIRWAYS", "MARRIOTT HOTELS",
            "HILTON WORLDWIDE", "HOLIDAY INN EXPRESS", "PRICELINE HOTELS",
            "KAYAK BOOKING", "HOSTELWORLD DEP", "URBN HOTEL GROUP",
        ],
        "price_range": (50, 2000),
    },
    "Education": {
        "weight": 0.05,
        "merchants": [
            "COURSERA CERT", "UDEMY ONLINE", "SKILLSHARE SUB",
            "LINKEDIN LEARNING", "MASTERCLASS SUB", "BOOKS AMAZON",
            "BARNES&NOBLE ONLINE", "SCHOLASTIC SHOP", "EDX MICROMASTERS",
            "STANFORD ONLINE", "HARVARD EXT SCHOOL", "CFA INSTITUTE",
            "SANS SECURITY INST", "PLURALSIGHT", "CODEACADEMY PRO",
        ],
        "price_range": (10, 500),
    },
    "Groceries": {
        "weight": 0.14,
        "merchants": [
            "WHOLE FOODS MKT", "TRADER JOE'S #47", "SAFEWAY STORE #1847",
            "KROGER #384", "PUBLIX #3847", "WALMART GROCERY",
            "COSTCO WHSE #3847", "ALDI #3847", "LIDL SUPERMARKET",
            "SPROUTS FRMKT #384", "FRESH MARKET #3847", "BI-RITE MARKET",
            "HAGGEN FOODS #3847", "FOOD LION #3847", "STOP & SHOP #3847",
        ],
        "price_range": (15, 300),
    },
}


def _generate_realistic_description(merchant: str, category: str) -> str:
    descriptors = {
        "Food & Dining": ["LUNCH", "DINNER", "BREAKFAST", "SNACK", "COFFEE", "TAKEOUT", "DELIVERY"],
        "Transportation": ["GAS STATION", "RIDE SHARE", "PARKING", "TOLL", "TRANSIT"],
        "Shopping": ["STORE", "ONLINE", "PICKUP", "SHIP", "MART"],
        "Entertainment": ["SUBSCRIPTION", "MOVIE", "GAME", "EVENT", "TICKET"],
        "Healthcare": ["PHARMACY", "CLINIC", "LAB", "VISIT", "PRESCRIPTION"],
        "Utilities & Bills": ["MONTHLY", "SERVICE", "BILL PAY", "AUTO PAY", "SUBSCRIPTION"],
        "Travel": ["BOOKING", "HOTEL", "FLIGHT", "RESORT", "AIRBNB"],
        "Education": ["COURSE", "BOOKS", "CERT", "TUITION", "TRAINING"],
        "Groceries": ["GROCERY", "MARKET", "PRODUCE", "FOOD", "SUPERMARKET"],
    }
    descs = descriptors.get(category, ["PURCHASE"])
    return f"{merchant} {random.choice(descs)}"


def generate_transactions(
    n_transactions: int = 15000,
    start_date: datetime = None,
    end_date: datetime = None,
    n_users: int = 5,
    monthly_income: float = 5000.0,
) -> pd.DataFrame:
    if start_date is None:
        start_date = datetime(2023, 1, 1)
    if end_date is None:
        end_date = datetime(2024, 12, 31)

    rows = []
    for user_idx in range(n_users):
        user_id = str(uuid.uuid4())
        user_income = monthly_income * random.uniform(0.7, 1.5)

        user_category_weights = {}
        for cat, data in CATEGORIES.items():
            user_category_weights[cat] = data["weight"] * random.uniform(0.6, 1.4)
        total = sum(user_category_weights.values())
        user_category_weights = {k: v / total for k, v in user_category_weights.items()}

        current = start_date
        while current <= end_date:
            # Monthly salary on the 1st
            day = datetime(current.year, current.month, 1)
            if day <= end_date:
                rows.append({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "amount": round(random.uniform(user_income * 0.95, user_income * 1.05), 2),
                    "transaction_type": "income",
                    "description": f"PAYROLL DIRECT DEP - {random.choice(['MONTHLY SALARY', 'PAYCHECK', 'SALARY', 'PAYROLL'])}",
                    "merchant": random.choice(["ACH PAYROLL DEP", "PAYROLL DIRECT DEP", "SALARY TRANSFER IN"]),
                    "category": "Salary/Income",
                    "transaction_date": day,
                })

            # Weekly random expenses
            week_offset = 0
            while week_offset < 28:
                tx_date = current + timedelta(days=week_offset + random.randint(0, 6))
                week_offset += 7
                if tx_date > end_date:
                    break

                n_daily_txns = random.randint(2, 8)
                for _ in range(n_daily_txns):
                    cat = random.choices(
                        list(user_category_weights.keys()),
                        weights=list(user_category_weights.values()),
                    )[0]
                    merchant = random.choice(CATEGORIES[cat]["merchants"])
                    amount = round(random.uniform(*CATEGORIES[cat]["price_range"]), 2)
                    if tx_date.weekday() >= 5 and cat == "Food & Dining":
                        amount *= random.uniform(1.3, 2.0)

                    rows.append({
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "amount": round(amount, 2),
                        "transaction_type": "expense",
                        "description": _generate_realistic_description(merchant, cat),
                        "merchant": merchant,
                        "category": cat,
                        "transaction_date": tx_date,
                    })

            # Next month
            if current.month == 12:
                current = datetime(current.year + 1, 1, 1)
            else:
                current = datetime(current.year, current.month + 1, 1)

    df = pd.DataFrame(rows)
    df = df.sort_values("transaction_date").reset_index(drop=True)
    return df


def inject_anomalies(df: pd.DataFrame, anomaly_rate: float = 0.02) -> pd.DataFrame:
    df = df.copy()
    df["is_anomaly"] = False
    df["anomaly_score"] = 0.0
    df["anomaly_reason"] = ""

    n_anomalies = int(len(df) * anomaly_rate)
    anomaly_indices = random.sample(range(len(df)), min(n_anomalies, len(df)))

    for idx in anomaly_indices:
        anomaly_type = random.choice(["unusual_amount", "unusual_merchant", "frequency"])

        if anomaly_type == "unusual_amount":
            row = df.iloc[idx]
            cat_data = df[df["category"] == row["category"]]
            if len(cat_data) > 0:
                cat_median = cat_data["amount"].median()
                if cat_median > 0 and row["amount"] > cat_median * 3:
                    df.loc[df.index[idx], "is_anomaly"] = True
                    df.loc[df.index[idx], "anomaly_score"] = round(random.uniform(0.6, 0.95), 4)
                    df.loc[df.index[idx], "anomaly_reason"] = "unusual_amount"

        elif anomaly_type == "unusual_merchant":
            df.loc[df.index[idx], "is_anomaly"] = True
            df.loc[df.index[idx], "anomaly_score"] = round(random.uniform(0.5, 0.8), 4)
            df.loc[df.index[idx], "anomaly_reason"] = "unusual_merchant_pattern"

        elif anomaly_type == "frequency":
            df.loc[df.index[idx], "is_anomaly"] = True
            df.loc[df.index[idx], "anomaly_score"] = round(random.uniform(0.55, 0.85), 4)
            df.loc[df.index[idx], "anomaly_reason"] = "high_frequency_transaction"

    return df


if __name__ == "__main__":
    print("Generating synthetic transaction data...")
    df = generate_transactions(n_transactions=15000, n_users=5)
    print(f"Generated {len(df)} transactions")
    print(df["transaction_type"].value_counts())
    df.to_csv("data/transactions.csv", index=False)
    print("Saved to data/transactions.csv")

    df_anomalous = inject_anomalies(df)
    df_anomalous.to_csv("data/transactions_with_anomalies.csv", index=False)
    print(f"Injected anomalies. Anomaly count: {df_anomalous['is_anomaly'].sum()}")
    print("Saved to data/transactions_with_anomalies.csv")
