"""
NLP Expense Categorizer.
Uses TF-IDF + Logistic Regression as the baseline model.
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder

# Resolve paths robustly (works in notebooks and as scripts)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_DIR = os.path.join(_SCRIPT_DIR, "..", "models")
os.makedirs(_MODEL_DIR, exist_ok=True)

# Import synthetic data generator
import sys as _sys
_sys.path.insert(0, _SCRIPT_DIR)
from synthetic_data import generate_transactions


def build_pipeline():
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=2,
            max_df=0.95,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=1.0,
            class_weight="balanced",
            solver="lbfgs",
            n_jobs=-1,
            random_state=42,
        )),
    ])


def train():
    print("Generating training data...")
    df = generate_transactions(n_transactions=15000, n_users=10)
    df = df[df["transaction_type"] == "expense"].copy()
    df["text"] = df["description"] + " " + df["merchant"].fillna("")

    X = df["text"].values
    y = df["category"].values

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")
    print(f"Categories: {list(label_encoder.classes_)}")

    pipeline = build_pipeline()
    print("Training model...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {accuracy:.4f}")
    print(classification_report(
        y_test, y_pred, target_names=label_encoder.classes_, digits=3
    ))

    # Save
    joblib.dump(pipeline, os.path.join(_MODEL_DIR, "category_model.joblib"))
    joblib.dump(label_encoder, os.path.join(_MODEL_DIR, "category_label_encoder.joblib"))
    print(f"\nModel saved to ml/models/category_model.joblib")
    print(f"Label encoder saved to ml/models/category_label_encoder.joblib")
    return pipeline, label_encoder


def predict(model, label_encoder, texts: list[str]):
    probs = model.predict_proba(texts)
    preds = model.predict(texts)
    results = []
    for i, (pred_idx, text) in enumerate(zip(preds, texts)):
        cat = label_encoder.inverse_transform([pred_idx])[0]
        conf = probs[i][pred_idx]
        top_indices = probs[i].argsort()[-3:][::-1]
        alternatives = {
            label_encoder.inverse_transform([idx])[0]: round(float(probs[i][idx]), 4)
            for idx in top_indices[1:]
        }
        results.append({
            "predicted_category": cat,
            "confidence": round(float(conf), 4),
            "alternatives": alternatives,
        })
    return results


if __name__ == "__main__":
    train()
