"""
Anomaly Detection for Financial Transactions.
Uses Isolation Forest + statistical methods.
"""
import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, precision_recall_fscore_support

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_DIR = os.path.join(_SCRIPT_DIR, "..", "models")
os.makedirs(_MODEL_DIR, exist_ok=True)

import sys
sys.path.insert(0, _SCRIPT_DIR)
from synthetic_data import generate_transactions, inject_anomalies


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    df["log_amount"] = np.log1p(df["amount"])

    cat_stats = df.groupby("category")["amount"].agg(["mean", "std", "median"]).reset_index()
    cat_stats.columns = ["category", "cat_mean", "cat_std", "cat_median"]
    df = df.merge(cat_stats, on="category", how="left")
    df["amount_vs_cat_mean"] = (df["amount"] - df["cat_mean"]) / (df["cat_std"] + 1e-6)
    df["amount_vs_cat_median"] = df["amount"] / (df["cat_median"] + 1e-6)

    df["hour"] = df["transaction_date"].dt.hour
    df["day_of_week"] = df["transaction_date"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    merchant_counts = df.groupby("merchant")["amount"].count().reset_index()
    merchant_counts.columns = ["merchant", "merchant_freq"]
    df = df.merge(merchant_counts, on="merchant", how="left")

    user_stats = df.groupby("user_id")["amount"].agg(["mean", "std", "sum"]).reset_index()
    user_stats.columns = ["user_id", "user_mean", "user_std", "user_total"]
    df = df.merge(user_stats, on="user_id", how="left")
    df["amount_vs_user_mean"] = (df["amount"] - df["user_mean"]) / (df["user_std"] + 1e-6)

    return df


def train():
    print("Generating data with anomalies...")
    df = generate_transactions(n_transactions=10000, n_users=5)
    df_anom = inject_anomalies(df, anomaly_rate=0.025)
    df_feat = extract_features(df_anom)

    feature_cols = [
        "log_amount",
        "amount_vs_cat_mean",
        "amount_vs_cat_median",
        "amount_vs_user_mean",
        "hour",
        "day_of_week",
        "is_weekend",
        "merchant_freq",
    ]

    X = df_feat[feature_cols].fillna(0).values
    y_true = df_feat["is_anomaly"].astype(int).values

    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y_true[:split], y_true[split:]

    print(f"Training samples: {len(X_train)}, Anomalies in train: {y_train.sum()}")
    print(f"Test samples: {len(X_test)}, Anomalies in test: {y_test.sum()}")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = IsolationForest(
        n_estimators=200,
        contamination=0.025,
        max_samples=0.8,
        random_state=42,
        n_jobs=-1,
    )

    print("Training Isolation Forest...")
    model.fit(X_train_scaled)

    raw_preds = model.predict(X_test_scaled)
    y_pred = (raw_preds == -1).astype(int)

    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="binary")
    print(f"\nPrecision: {precision:.3f}, Recall: {recall:.3f}, F1: {f1:.3f}")
    print(classification_report(y_test, y_pred, target_names=["Normal", "Anomaly"], digits=3))

    scores = model.score_samples(X_test_scaled)
    print(f"Anomaly score range: [{scores.min():.4f}, {scores.max():.4f}]")

    joblib.dump(model, os.path.join(_MODEL_DIR, "anomaly_model.joblib"))
    joblib.dump(scaler, os.path.join(_MODEL_DIR, "anomaly_scaler.joblib"))
    print(f"Anomaly model saved to ml/models/anomaly_model.joblib")
    return model, scaler


if __name__ == "__main__":
    train()
