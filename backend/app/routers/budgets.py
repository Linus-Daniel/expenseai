from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from app.database import get_db
from app.models.user import User, Budget
from app.schemas.schemas import BudgetCreate, BudgetOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.post("/", response_model=BudgetOut, status_code=201)
async def create_budget(data: BudgetCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(Budget).where(
            and_(
                Budget.user_id == user.id,
                Budget.category == data.category,
                Budget.month == data.month,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Budget already set for this category and month")

    budget = Budget(user_id=user.id, category=data.category, monthly_limit=data.monthly_limit, month=data.month)
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.get("/", response_model=list[BudgetOut])
async def list_budgets(month: str = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Budget).where(Budget.user_id == user.id)
    if month:
        query = query.where(Budget.month == month)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/{budget_id}", response_model=BudgetOut)
async def update_budget(budget_id: UUID, data: BudgetCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Budget).where(Budget.id == budget_id, Budget.user_id == user.id))
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    budget.monthly_limit = data.monthly_limit
    budget.category = data.category
    budget.month = data.month
    await db.commit()
    await db.refresh(budget)
    return budget
