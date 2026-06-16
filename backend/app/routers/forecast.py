from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date
from app.database import get_db
from app.models.user import User, Transaction
from app.schemas.schemas import ForecastResult
from app.services.auth_service import get_current_user
from app.services.ml_service import get_forecast_service

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.post("/spending", response_model=ForecastResult)
async def forecast_spending(
    days: int = 7,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = get_forecast_service()

    result = await db.execute(
        select(Transaction)
        .where(
            Transaction.user_id == user.id,
            Transaction.transaction_type == "expense",
        )
        .order_by(Transaction.transaction_date.desc())
        .limit(90)
    )
    txs = result.scalars().all()

    # Build daily series without pandas
    daily_totals = {}
    for t in txs:
        d = t.transaction_date.date()
        daily_totals[d] = daily_totals.get(d, 0.0) + t.amount

    # Fill to 30 days minimum
    history = []
    if daily_totals:
        oldest = min(daily_totals.keys())
        today = date.today()
        d = oldest
        while d <= today:
            history.append(daily_totals.get(d, 0.0))
            d += __import__("datetime").timedelta(days=1)

    if len(history) < 30:
        history = [0.0] * (30 - len(history)) + history

    forecast_result = svc.predict(history[-90:])

    return ForecastResult(
        predicted_amount=round(forecast_result["predicted_daily_avg"] * days, 2),
        period="daily",
        confidence=forecast_result["confidence"],
    )
