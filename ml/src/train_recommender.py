"""
RL-based Financial Recommendation Engine.
Uses a rule-based + simulation approach to generate personalized budget advice.
"""
import os
import sys
import random
from dataclasses import dataclass
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)


@dataclass
class UserProfile:
    monthly_income: float
    monthly_savings_goal: float
    risk_tolerance: str  # low, moderate, high
    top_categories: dict  # category -> total spend
    total_expenses: float
    total_income: float


@dataclass
class Recommendation:
    recommendation_type: str
    title: str
    body: str
    priority: int  # 1=high, 2=medium, 3=low
    savings_potential: Optional[float] = None


class FinancialRecommender:
    """
    Rule-based + light simulation recommender.
    Returns prioritized, actionable recommendations based on user financial profile.
    """

    def __init__(self):
        self.categories = [
            "Food & Dining", "Transportation", "Shopping", "Entertainment",
            "Healthcare", "Utilities & Bills", "Travel", "Education", "Groceries",
        ]

    def recommend(self, profile: UserProfile) -> list[Recommendation]:
        recs = []
        savings = profile.monthly_income - profile.total_expenses
        savings_rate = savings / profile.monthly_income if profile.monthly_income > 0 else 0

        # ── Savings rate checks ────────────────────────────────────────────
        if savings < 0:
            recs.append(Recommendation(
                recommendation_type="budget",
                title="You spent more than you earned this month",
                body=f"You overspent by ${abs(savings):.2f}. Review your top expense categories and identify areas to cut back.",
                priority=1,
            ))
        elif savings_rate < 0.1:
            recs.append(Recommendation(
                recommendation_type="savings",
                title="Low savings rate detected",
                body=f"Your savings rate is {savings_rate*100:.1f}%, below the recommended 20%. "
                     "Consider automating a portion of your income to savings.",
                priority=1,
                savings_potential=profile.monthly_income * 0.1,
            ))
        elif savings_rate >= 0.2:
            recs.append(Recommendation(
                recommendation_type="savings",
                title="Great savings discipline!",
                body=f"You're saving {savings_rate*100:.1f}% of your income. Consider investing a portion in low-risk assets.",
                priority=3,
            ))

        # ── Category budget alerts ─────────────────────────────────────────
        income_pct = profile.monthly_income
        for cat, spend in sorted(profile.top_categories.items(), key=lambda x: -x[1])[:3]:
            pct = spend / income_pct if income_pct > 0 else 0
            thresholds = {
                "Food & Dining": 0.12,
                "Groceries": 0.10,
                "Transportation": 0.10,
                "Entertainment": 0.05,
                "Shopping": 0.08,
                "Utilities & Bills": 0.08,
                "Healthcare": 0.05,
                "Travel": 0.05,
                "Education": 0.05,
            }
            threshold = thresholds.get(cat, 0.08)
            if pct > threshold:
                recs.append(Recommendation(
                    recommendation_type="budget",
                    title=f"{cat} spending is above recommended",
                    body=f"You've spent {pct*100:.1f}% of income on {cat}, "
                         f"vs. the recommended {threshold*100:.0f}%. "
                         f"Potential monthly savings: ${spend - income_pct*threshold:.2f}",
                    priority=1 if pct > threshold * 1.5 else 2,
                    savings_potential=spend - income_pct * threshold,
                ))

        # ── Savings goal tracking ──────────────────────────────────────────
        if profile.monthly_savings_goal > 0:
            shortfall = profile.monthly_savings_goal - savings
            if shortfall > 0:
                recs.append(Recommendation(
                    recommendation_type="savings",
                    title="Monthly savings goal at risk",
                    body=f"You're ${shortfall:.2f} short of your ${profile.monthly_savings_goal:.2f} savings goal. "
                         "Review discretionary spending or consider increasing income.",
                    priority=2,
                    savings_potential=shortfall,
                ))

        # ── Risk-based investment recommendations ───────────────────────────
        if profile.risk_tolerance == "high" and savings_rate >= 0.15:
            recs.append(Recommendation(
                recommendation_type="investment",
                title="Consider investing your surplus",
                body=f"With ${savings:.2f} monthly surplus and high risk tolerance, "
                     "you could allocate up to 30% to diversified index funds.",
                priority=2,
            ))
        elif profile.risk_tolerance == "low":
            recs.append(Recommendation(
                recommendation_type="investment",
                title="Build your emergency fund first",
                body="Before investing, aim to save 3-6 months of expenses as an emergency fund "
                     "in a high-yield savings account.",
                priority=2,
            ))

        # Sort by priority
        recs.sort(key=lambda r: r.priority)
        return recs


def demo():
    recommender = FinancialRecommender()

    profile = UserProfile(
        monthly_income=5000,
        monthly_savings_goal=1000,
        risk_tolerance="moderate",
        top_categories={
            "Food & Dining": 750,
            "Transportation": 400,
            "Shopping": 600,
            "Entertainment": 300,
            "Utilities & Bills": 450,
            "Groceries": 500,
        },
        total_expenses=3000,
        total_income=5000,
    )

    recs = recommender.recommend(profile)
    print(f"Generated {len(recs)} recommendations for demo user:\n")
    for r in recs:
        print(f"[P{r.priority}] {r.title}")
        print(f"  {r.body}")
        if r.savings_potential:
            print(f"  Savings potential: ${r.savings_potential:.2f}")
        print()


if __name__ == "__main__":
    demo()
