#!/bin/sh
set -e
echo "Running migrations..."
cd /app
python -c "
import asyncio
from sqlalchemy import create_engine, text
from app.database import Base
from app.models.user import User, Transaction, Budget, Recommendation
import os

DATABASE_URL = os.environ.get('DATABASE_URL_SYNC')
if not DATABASE_URL:
    print('DATABASE_URL_SYNC not set, skipping migrations')
else:
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    print('Tables created successfully')

    # Check if demo user exists
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1 FROM users LIMIT 1'))
        if result.fetchone() is None:
            print('Seeding demo data...')
            conn.execute(text('''
                INSERT INTO users (email, hashed_password, full_name, monthly_income, monthly_savings_goal, risk_tolerance, is_active)
                VALUES (:email, :pw, :name, :income, :goal, :risk, true)
            '''), {
                'email': 'demo@expenseai.com',
                'pw': '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qPF4b0JX3y9Ly',
                'name': 'Demo User',
                'income': 5500.0,
                'goal': 1100.0,
                'risk': 'moderate'
            })
            conn.commit()
            print('Demo user created')
        else:
            print('Database already seeded')
"

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
