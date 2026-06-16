from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


# ─── Auth ────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None
    monthly_income: Optional[float] = None
    monthly_savings_goal: Optional[float] = None
    risk_tolerance: str = "moderate"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    monthly_income: Optional[float]
    monthly_savings_goal: Optional[float]
    risk_tolerance: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Transactions ─────────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    amount: float = Field(gt=0)
    transaction_type: TransactionType
    description: str = Field(min_length=1, max_length=500)
    merchant: Optional[str] = None
    transaction_date: Optional[datetime] = None


class TransactionOut(BaseModel):
    id: UUID
    user_id: UUID
    amount: float
    transaction_type: TransactionType
    description: str
    merchant: Optional[str]
    category: Optional[str]
    predicted_category: Optional[str]
    is_anomaly: bool
    anomaly_score: Optional[float]
    transaction_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Budgets ──────────────────────────────────────────────────────────────────
class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float = Field(gt=0)
    month: str = Field(pattern=r"^\d{4}-\d{2}$")


class BudgetOut(BaseModel):
    id: UUID
    user_id: UUID
    category: str
    monthly_limit: float
    current_spent: float
    month: str

    class Config:
        from_attributes = True


# ─── ML / Analytics ───────────────────────────────────────────────────────────
class CategoryPrediction(BaseModel):
    predicted_category: str
    confidence: float
    alternatives: dict[str, float]


class ForecastResult(BaseModel):
    predicted_amount: float
    period: str  # "daily", "weekly", "monthly"
    confidence: float


class AnomalyResult(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    reason: Optional[str] = None


class SpendingSummary(BaseModel):
    total_income: float
    total_expenses: float
    net_savings: float
    top_category: Optional[str]
    category_breakdown: dict[str, float]
    anomaly_count: int


class RecommendationOut(BaseModel):
    id: UUID
    recommendation_type: str
    title: str
    body: str
    priority: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
