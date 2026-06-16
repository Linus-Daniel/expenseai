#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== ExpenseAI Setup ==="

# 1. Create venv if missing
if [ ! -d "venv" ]; then
    echo "[1/6] Creating virtual environment..."
    python3 -m venv venv
fi

# 2. Activate
source venv/bin/activate

# 3. Install packages
echo "[2/6] Installing Python packages..."
pip install --upgrade pip
pip install "email-validator"
pip install "bcrypt==4.2.1" --force-reinstall
pip install fastapi uvicorn sqlalchemy asyncpg psycopg2-binary \
    pydantic pydantic-settings "python-jose[cryptography]" \
    "passlib[bcrypt]" python-multipart alembic httpx \
    python-dotenv redis pytest pytest-asyncio

# 4. Drop & recreate DB (fresh start)
echo "[3/6] Setting up PostgreSQL database (fresh)..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS expenseai;"
sudo -u postgres psql -c "CREATE DATABASE expenseai;"

# 5. Set env vars
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/expenseai"
export DATABASE_URL_SYNC="postgresql+psycopg2://postgres:postgres@localhost:5432/expenseai"
export SECRET_KEY="dev-secret-key"
export MODEL_DIR="ml/models"

# 6. Run migrations then seed
echo "[4/6] Running migrations..."
cd backend
alembic upgrade head
cd ..

echo "[5/6] Seeding database..."
python -m backend.app.seed

echo "[6/6] Starting API server..."
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
