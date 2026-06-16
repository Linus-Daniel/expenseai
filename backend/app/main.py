import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, transactions, forecast, recommendations, budgets

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.ml_service import get_category_service, get_forecast_service, get_anomaly_service
    cat = get_category_service()
    fc = get_forecast_service()
    anom = get_anomaly_service()
    print(f"[ML] Categorizer ready: {cat.is_ready()}")
    print(f"[ML] Forecaster ready: {fc.is_ready()}")
    print(f"[ML] Anomaly detector ready: {anom.is_ready()}")
    yield


app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(transactions.router, prefix=settings.API_PREFIX)
app.include_router(forecast.router, prefix=settings.API_PREFIX)
app.include_router(recommendations.router, prefix=settings.API_PREFIX)
app.include_router(budgets.router, prefix=settings.API_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION}


@app.get("/")
async def root():
    return {"message": "ExpenseAI API", "docs": "/docs"}
