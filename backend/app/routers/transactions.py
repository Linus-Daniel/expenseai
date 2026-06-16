from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.models.user import User, Transaction
from app.models.user import TransactionType
from app.schemas.schemas import (
    TransactionCreate, TransactionOut, CategoryPrediction,
    AnomalyResult, SpendingSummary
)
from app.services.auth_service import get_current_user
from app.services.ml_service import get_category_service, get_anomaly_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/", response_model=TransactionOut, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cat_svc = get_category_service()
    anom_svc = get_anomaly_service()

    cat_result = cat_svc.predict(data.description, data.merchant or "")
    anom_result = anom_svc.detect(
        amount=data.amount,
        category=cat_result["predicted_category"],
        user_mean=user.monthly_income or 3000,
        user_std=(user.monthly_income or 3000) * 0.3,
        cat_mean=200, cat_std=150, cat_median=150,
    )

    tx = Transaction(
        user_id=user.id,
        amount=data.amount,
        transaction_type=TransactionType(data.transaction_type.value),
        description=data.description,
        merchant=data.merchant,
        predicted_category=cat_result["predicted_category"],
        is_anomaly=anom_result["is_anomaly"],
        anomaly_score=anom_result["anomaly_score"],
        transaction_date=data.transaction_date or datetime.utcnow(),
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


@router.get("/", response_model=list[TransactionOut])
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Transaction).where(Transaction.user_id == user.id)
    if start_date:
        query = query.where(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.where(Transaction.transaction_date <= end_date)
    if category:
        query = query.where(Transaction.predicted_category == category)

    query = query.order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/summary", response_model=SpendingSummary)
async def spending_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Transaction).where(Transaction.user_id == user.id)
    if start_date:
        query = query.where(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.where(Transaction.transaction_date <= end_date)

    result = await db.execute(query)
    txs = result.scalars().all()

    total_income = sum(float(t.amount) for t in txs if t.transaction_type.value == "income")
    total_expenses = sum(float(t.amount) for t in txs if t.transaction_type.value == "expense")

    cat_totals = {}
    for t in txs:
        if t.transaction_type.value == "expense" and t.predicted_category:
            cat_totals[t.predicted_category] = cat_totals.get(t.predicted_category, 0.0) + float(t.amount)

    top_cat = max(cat_totals, key=cat_totals.get) if cat_totals else None

    return SpendingSummary(
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        net_savings=round(total_income - total_expenses, 2),
        top_category=top_cat,
        category_breakdown={k: round(v, 2) for k, v in cat_totals.items()},
        anomaly_count=sum(1 for t in txs if t.is_anomaly),
    )


@router.post("/categorize", response_model=CategoryPrediction)
async def categorize(description: str, merchant: str = "", user: User = Depends(get_current_user)):
    svc = get_category_service()
    result = svc.predict(description, merchant)
    return CategoryPrediction(**result)


@router.post("/detect-anomaly", response_model=AnomalyResult)
async def detect_anomaly(amount: float, category: str = "", user: User = Depends(get_current_user)):
    svc = get_anomaly_service()
    result = svc.detect(
        amount=amount, category=category,
        user_mean=user.monthly_income or 3000,
        user_std=(user.monthly_income or 3000) * 0.3,
        cat_mean=200, cat_std=150, cat_median=150,
    )
    return AnomalyResult(**result)
