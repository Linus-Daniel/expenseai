from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models.user import User, Recommendation, Transaction
from app.schemas.schemas import RecommendationOut
from app.services.auth_service import get_current_user
from app.ml.recommender import FinancialRecommender, UserProfile

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def build_profile(user: User, txs: list) -> UserProfile:
    total_income = sum(float(t.amount) for t in txs if t.transaction_type.value == "income")
    total_expenses = sum(float(t.amount) for t in txs if t.transaction_type.value == "expense")

    cat_totals = {}
    for t in txs:
        if t.transaction_type.value == "expense" and t.predicted_category:
            cat_totals[t.predicted_category] = cat_totals.get(t.predicted_category, 0.0) + float(t.amount)

    return UserProfile(
        monthly_income=user.monthly_income or total_income or 5000,
        monthly_savings_goal=user.monthly_savings_goal or 0,
        risk_tolerance=user.risk_tolerance or "moderate",
        top_categories=cat_totals,
        total_expenses=total_expenses,
        total_income=total_income,
    )


@router.get("/", response_model=list[RecommendationOut])
async def get_recommendations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.transaction_date.desc())
        .limit(500)
    )
    txs = result.scalars().all()

    profile = build_profile(user, txs)
    recommender = FinancialRecommender()
    recs = recommender.recommend(profile)

    db_recs = []
    for r in recs:
        rec = Recommendation(
            user_id=user.id,
            recommendation_type=r.recommendation_type,
            title=r.title,
            body=r.body,
            priority=r.priority,
        )
        db.add(rec)
        db_recs.append(rec)

    await db.commit()
    for rec in db_recs:
        await db.refresh(rec)

    return db_recs


@router.patch("/{rec_id}/read")
async def mark_read(rec_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Recommendation).where(Recommendation.id == rec_id, Recommendation.user_id == user.id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.is_read = True
    await db.commit()
    return {"status": "ok"}


@router.patch("/{rec_id}/dismiss")
async def dismiss(rec_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Recommendation).where(Recommendation.id == rec_id, Recommendation.user_id == user.id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.is_dismissed = True
    await db.commit()
    return {"status": "ok"}
