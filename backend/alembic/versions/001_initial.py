"""Initial migration - create all tables

Revision ID: 001_initial
Revises:
Create Date: 2026-06-12

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('monthly_income', sa.Float, nullable=True),
        sa.Column('monthly_savings_goal', sa.Float, nullable=True),
        sa.Column('risk_tolerance', sa.String(20), default='moderate'),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # transactions table
    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount', sa.Float, nullable=False),
        sa.Column('transaction_type', sa.String(20), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('merchant', sa.String(255), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('predicted_category', sa.String(100), nullable=True),
        sa.Column('is_anomaly', sa.Boolean, default=False),
        sa.Column('anomaly_score', sa.Float, nullable=True),
        sa.Column('transaction_date', sa.DateTime, default=sa.func.now()),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )

    # budgets table
    op.create_table(
        'budgets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('monthly_limit', sa.Float, nullable=False),
        sa.Column('current_spent', sa.Float, default=0.0),
        sa.Column('month', sa.String(7), nullable=False),
    )

    # recommendations table
    op.create_table(
        'recommendations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('recommendation_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('body', sa.Text, nullable=False),
        sa.Column('priority', sa.Integer, default=1),
        sa.Column('is_read', sa.Boolean, default=False),
        sa.Column('is_dismissed', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('recommendations')
    op.drop_table('budgets')
    op.drop_table('transactions')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
