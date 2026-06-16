"""
LSTM-based Spending Forecaster.
Predicts daily/weekly spending based on transaction history.
"""
import os
import numpy as np
import pandas as pd
import joblib

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_DIR = os.path.join(_SCRIPT_DIR, "..", "models")
os.makedirs(_MODEL_DIR, exist_ok=True)

import sys
sys.path.insert(0, _SCRIPT_DIR)
from synthetic_data import generate_transactions

SEQUENCE_LENGTH = 30
FORECAST_HORIZON = 7

np.random.seed(42)


def create_sequences(data: np.ndarray, seq_len: int, horizon: int):
    X, y = [], []
    for i in range(len(data) - seq_len - horizon + 1):
        X.append(data[i : i + seq_len])
        y.append(data[i + seq_len : i + seq_len + horizon])
    return np.array(X), np.array(y)


def build_model(seq_len: int, horizon: int, n_features: int = 1):
    try:
        import tensorflow as tf
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout
        from tensorflow.keras.optimizers import Adam

        tf.random.set_seed(42)
        np.random.seed(42)

        model = Sequential([
            LSTM(64, activation="tanh", return_sequences=True, input_shape=(seq_len, n_features)),
            Dropout(0.2),
            LSTM(32, activation="tanh"),
            Dropout(0.2),
            Dense(32, activation="relu"),
            Dense(horizon),
        ])
        model.compile(optimizer=Adam(learning_rate=0.001), loss="mse", metrics=["mae"])
        return model
    except ImportError as e:
        print(f"TensorFlow not available: {e}")
        return None


def generate_forecast_data(n_users: int = 5) -> pd.DataFrame:
    df = generate_transactions(n_transactions=15000, n_users=n_users)
    df = df[df["transaction_type"] == "expense"].copy()
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    df["date"] = df["transaction_date"].dt.date

    daily = (
        df.groupby(["user_id", "date"])["amount"]
        .sum()
        .reset_index()
        .sort_values("date")
    )
    return daily


def train():
    print("Generating time-series training data...")
    daily = generate_forecast_data(n_users=5)
    all_series = []

    for user_id, group in daily.groupby("user_id"):
        dates = pd.date_range(group["date"].min(), group["date"].max(), freq="D")
        amounts = pd.Series(
            group.set_index("date")["amount"].reindex(dates, fill_value=0).values,
            index=dates,
        )
        df = pd.DataFrame({
            "amount": amounts.values,
            "dow": amounts.index.dayofweek,
            "is_weekend": (amounts.index.dayofweek >= 5).astype(int),
        }, index=amounts.index)
        all_series.append(df)

    combined = pd.concat(all_series, ignore_index=True)

    try:
        from sklearn.preprocessing import MinMaxScaler
    except ImportError:
        print("sklearn not available — skipping forecast model training")
        return None, None

    scaler = MinMaxScaler()
    amounts = scaler.fit_transform(combined[["amount"]]).flatten()

    X, y = create_sequences(amounts, SEQUENCE_LENGTH, FORECAST_HORIZON)
    print(f"Sequences: {len(X)}, Shape X: {X.shape}, Shape y: {y.shape}")

    X_train, X_test, y_train, y_test = X[:int(0.8*len(X))], X[int(0.8*len(X)):], y[:int(0.8*len(y))], y[int(0.8*len(y)):]

    model = build_model(SEQUENCE_LENGTH, FORECAST_HORIZON)
    if model is None:
        print("Skipping LSTM training — tensorflow not installed")
        return None, scaler

    model.summary()

    try:
        from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
        callbacks = [
            EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True),
            ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6),
        ]
        print("Training LSTM...")
        history = model.fit(
            X_train, y_train,
            validation_split=0.1,
            epochs=50,
            batch_size=64,
            callbacks=callbacks,
            verbose=1,
        )
    except Exception as e:
        print(f"Training interrupted: {e}")

    loss, mae = model.evaluate(X_test, y_test, verbose=0)
    print(f"\nTest Loss: {loss:.4f}, Test MAE: {mae:.4f}")

    model.save(os.path.join(_MODEL_DIR, "forecast_model.keras"))
    joblib.dump(scaler, os.path.join(_MODEL_DIR, "forecast_scaler.joblib"))
    print(f"Forecast model saved to ml/models/forecast_model.keras")
    print(f"Scaler saved to ml/models/forecast_scaler.joblib")
    return model, scaler


if __name__ == "__main__":
    train()
