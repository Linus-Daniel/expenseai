"""
RL-style Financial Recommendation Engine.
Rule-based + light simulation for personalized budget advice.
"""
from dataclasses import dataclass
from typing import Optional


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
    Rule-based recommender that generates prioritized, actionable
    financial advice based on a user's spending profile.
    """

    def recommend(self, profile: UserProfile) -> list[Recommendation]:
        recs = []
        savings = profile.monthly_income - profile.total_expenses
        savings_rate = savings / profile.monthly_income if profile.monthly_income > 0 else 0

        # Savings rate checks
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

        # Category budget alerts
        thresholds = {
            "Food & Dining": 0.12, "Groceries": 0.10, "Transportation": 0.10,
            "Entertainment": 0.05, "Shopping": 0.08, "Utilities & Bills": 0.08,
            "Healthcare": 0.05, "Travel": 0.05, "Education": 0.05,
        }
        for cat, spend in sorted(profile.top_categories.items(), key=lambda x: -x[1])[:3]:
            pct = spend / profile.monthly_income if profile.monthly_income > 0 else 0
            threshold = thresholds.get(cat, 0.08)
            if pct > threshold:
                recs.append(Recommendation(
                    recommendation_type="budget",
                    title=f"{cat} spending is above recommended",
                    body=f"You've spent {pct*100:.1f}% of income on {cat}, "
                         f"vs. the recommended {threshold*100:.0f}%. "
                         f"Potential monthly savings: ${spend - profile.monthly_income*threshold:.2f}",
                    priority=1 if pct > threshold * 1.5 else 2,
                    savings_potential=spend - profile.monthly_income * threshold,
                ))

        # Savings goal
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

        # Risk-based investment advice
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

        recs.sort(key=lambda r: r.priority)
        return recs
