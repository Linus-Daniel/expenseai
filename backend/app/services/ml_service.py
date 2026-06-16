"""
ML Service — loads trained models and exposes inference methods.
"""
import os
import joblib
import numpy as np
from typing import Optional
from app.config import get_settings

settings = get_settings()
MODEL_DIR = settings.MODEL_DIR


class CategoryService:
    """NLP-based expense categorization."""

    def __init__(self):
        self.model = None
        self.label_encoder = None
        self._load()

    def _load(self):
        model_path = os.path.join(MODEL_DIR, "category_model.joblib")
        encoder_path = os.path.join(MODEL_DIR, "category_label_encoder.joblib")
        if os.path.exists(model_path) and os.path.exists(encoder_path):
            self.model = joblib.load(model_path)
            self.label_encoder = joblib.load(encoder_path)
        else:
            self.model = None
            self.label_encoder = None

    def is_ready(self) -> bool:
        return self.model is not None

    def predict(self, description: str, merchant: str = "") -> dict:
        if not self.model:
            return {"predicted_category": "Uncategorized", "confidence": 0.0, "alternatives": {}}

        text = f"{description} {merchant}".strip()
        probs = self.model.predict_proba([text])[0]
        pred_idx = np.argmax(probs)
        cat = self.label_encoder.inverse_transform([pred_idx])[0]
        conf = float(probs[pred_idx])

        top_indices = probs.argsort()[-3:][::-1]
        alternatives = {
            self.label_encoder.inverse_transform([idx])[0]: round(float(probs[idx]), 4)
            for idx in top_indices[1:]
        }
        return {"predicted_category": cat, "confidence": round(conf, 4), "alternatives": alternatives}

    def batch_predict(self, texts: list[str]) -> list[dict]:
        if not self.model:
            return [{"predicted_category": "Uncategorized", "confidence": 0.0, "alternatives": {}}] * len(texts)
        probs = self.model.predict_proba(texts)
        results = []
        for i, row in enumerate(probs):
            pred_idx = np.argmax(row)
            cat = self.label_encoder.inverse_transform([pred_idx])[0]
            conf = float(row[pred_idx])
            top_indices = row.argsort()[-3:][::-1]
            alternatives = {
                self.label_encoder.inverse_transform([idx])[0]: round(float(row[idx]), 4)
                for idx in top_indices[1:]
            }
            results.append({"predicted_category": cat, "confidence": round(conf, 4), "alternatives": alternatives})
        return results


class ForecastService:
    """LSTM-based spending forecaster."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self._load()

    def _load(self):
        model_path = os.path.join(MODEL_DIR, "forecast_model.keras")
        scaler_path = os.path.join(MODEL_DIR, "forecast_scaler.joblib")
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            try:
                from tensorflow.keras.models import load_model
                self.model = load_model(model_path, compile=False)
                self.scaler = joblib.load(scaler_path)
            except Exception:
                self.model = None
                self.scaler = None
        else:
            self.model = None
            self.scaler = None

    def is_ready(self) -> bool:
        return self.model is not None and self.scaler is not None

    def predict(self, history: list[float]) -> dict:
        """Predict next 7 days of spending given daily amounts."""
        if not self.is_ready():
            avg = np.mean(history) if history else 0.0
            return {"predicted_daily_avg": round(float(avg), 2), "forecast": [], "confidence": 0.0}

        seq_len = 30
        scaled = self.scaler.transform(np.array(history[-seq_len:]).reshape(-1, 1))
        X = scaled.reshape(1, seq_len, 1)
        pred_scaled = self.model.predict(X, verbose=0)
        forecast = self.scaler.inverse_transform(pred_scaled.reshape(-1, 1)).flatten()
        avg = float(np.mean(forecast))

        return {
            "predicted_daily_avg": round(avg, 2),
            "forecast": [round(float(v), 2) for v in forecast],
            "confidence": 0.75,
        }


class AnomalyService:
    """Isolation Forest anomaly detection."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self._load()

    def _load(self):
        model_path = os.path.join(MODEL_DIR, "anomaly_model.joblib")
        scaler_path = os.path.join(MODEL_DIR, "anomaly_scaler.joblib")
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
        else:
            self.model = None
            self.scaler = None

    def is_ready(self) -> bool:
        return self.model is not None

    def extract_features(self, amount: float, category: str, user_mean: float, user_std: float,
                         cat_mean: float, cat_std: float, cat_median: float) -> np.ndarray:
        log_amount = np.log1p(amount)
        amount_vs_cat = (amount - cat_mean) / (cat_std + 1e-6) if cat_std > 0 else 0
        amount_vs_cat_med = amount / (cat_median + 1e-6)
        amount_vs_user = (amount - user_mean) / (user_std + 1e-6) if user_std > 0 else 0
        features = np.array([[log_amount, amount_vs_cat, amount_vs_cat_med, amount_vs_user, 12.0, 3.0, 0.0, 50.0]])
        return self.scaler.transform(features) if self.scaler else features

    def detect(self, amount: float, category: str = "", user_mean: float = 0,
               user_std: float = 1, cat_mean: float = 0, cat_std: float = 1,
               cat_median: float = 0) -> dict:
        if not self.is_ready():
            score = 0.0
            is_anomaly = abs(amount - user_mean) > 3 * user_std if user_std > 0 else False
        else:
            features = self.extract_features(amount, category, user_mean, user_std, cat_mean, cat_std, cat_median)
            score = float(self.model.score_samples(features)[0])
            is_anomaly = self.model.predict(features)[0] == -1

        reason = None
        if is_anomaly:
            if amount > cat_mean * 3 and cat_mean > 0:
                reason = "unusually_high_for_category"
            elif abs(amount - user_mean) > 3 * user_std and user_std > 0:
                reason = "outside_user_spending_pattern"
            else:
                reason = "statistical_outlier"

        return {
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": round(float(score), 4),
            "reason": reason,
        }


# Singleton instances
_category_service: Optional[CategoryService] = None
_forecast_service: Optional[ForecastService] = None
_anomaly_service: Optional[AnomalyService] = None


def get_category_service() -> CategoryService:
    global _category_service
    if _category_service is None:
        _category_service = CategoryService()
    return _category_service


def get_forecast_service() -> ForecastService:
    global _forecast_service
    if _forecast_service is None:
        _forecast_service = ForecastService()
    return _forecast_service


def get_anomaly_service() -> AnomalyService:
    global _anomaly_service
    if _anomaly_service is None:
        _anomaly_service = AnomalyService()
    return _anomaly_service
