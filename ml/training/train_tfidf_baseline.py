"""
Trains the TF-IDF + Logistic Regression baseline document classifier --
the "simpler baseline" recommended in the project plan, and the same model
family as the in-app TypeScript classifier (src/lib/classifier), just
trained here with scikit-learn on a larger labeled dataset.

Usage:
    python ml/training/train_tfidf_baseline.py \
        --data ml/data/sample_dataset.csv \
        --out ml/models/tfidf_baseline

Produces (inside --out):
    model.joblib        # LogisticRegression classifier
    vectorizer.joblib    # fitted TfidfVectorizer
    label_encoder.joblib # fitted LabelEncoder
    metrics.json         # accuracy / precision / recall / f1 on the held-out test split
    version.json         # model version string + trained-at timestamp
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preprocessing.clean import clean_dataframe  # noqa: E402

MODEL_VERSION = "tfidf-logreg-v1"


def main():
    parser = argparse.ArgumentParser(description="Train the TF-IDF baseline document classifier.")
    parser.add_argument("--data", default="ml/data/sample_dataset.csv")
    parser.add_argument("--out", default="ml/models/tfidf_baseline")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.data)
    df = clean_dataframe(df, text_column="text")
    if df["label"].nunique() < 2:
        raise SystemExit("Need at least 2 distinct labels in the dataset to train a classifier.")

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df["label"])

    # Small datasets (like the bundled sample) can have too few examples per
    # class for a stratified split -- fall back to a plain random split.
    stratify = y if df["label"].value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], y, test_size=args.test_size, random_state=args.seed, stratify=stratify
    )

    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2), sublinear_tf=True)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(max_iter=1000, C=1.0, class_weight="balanced")
    model.fit(X_train_vec, y_train)

    y_pred = model.predict(X_test_vec)
    report = classification_report(
        y_test, y_pred, target_names=label_encoder.classes_, output_dict=True, zero_division=0
    )
    accuracy = accuracy_score(y_test, y_pred)

    joblib.dump(model, out_dir / "model.joblib")
    joblib.dump(vectorizer, out_dir / "vectorizer.joblib")
    joblib.dump(label_encoder, out_dir / "label_encoder.joblib")

    metrics = {"accuracy": accuracy, "report": report, "test_size": len(X_test)}
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))

    version_info = {
        "model_version": MODEL_VERSION,
        "model_type": "tfidf_logreg",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_examples": len(df),
        "classes": label_encoder.classes_.tolist(),
    }
    (out_dir / "version.json").write_text(json.dumps(version_info, indent=2))

    print(f"Trained on {len(X_train)} examples, evaluated on {len(X_test)}.")
    print(f"Accuracy: {accuracy:.3f}")
    print(f"Saved model to {out_dir}/")


if __name__ == "__main__":
    main()
