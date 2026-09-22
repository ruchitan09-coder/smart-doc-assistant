"""
Evaluates a trained TF-IDF baseline model (ml/training/train_tfidf_baseline.py
output) against a CSV of held-out labeled examples, and prints a full
classification report. Use this to sanity-check a model on fresh data before
promoting it (e.g. before pointing MODEL_API_URL at a new version).

Usage:
    python ml/evaluation/evaluate.py \
        --model ml/models/tfidf_baseline \
        --data ml/data/sample_dataset.csv
"""
import argparse
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preprocessing.clean import clean_dataframe  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Evaluate a trained TF-IDF baseline classifier.")
    parser.add_argument("--model", default="ml/models/tfidf_baseline")
    parser.add_argument("--data", default="ml/data/sample_dataset.csv")
    args = parser.parse_args()

    model_dir = Path(args.model)
    model = joblib.load(model_dir / "model.joblib")
    vectorizer = joblib.load(model_dir / "vectorizer.joblib")
    label_encoder = joblib.load(model_dir / "label_encoder.joblib")

    df = pd.read_csv(args.data)
    df = clean_dataframe(df, text_column="text")

    X = vectorizer.transform(df["text"])
    y_true = label_encoder.transform(df["label"])
    y_pred = model.predict(X)

    print(f"Accuracy: {accuracy_score(y_true, y_pred):.3f}\n")
    print(classification_report(y_true, y_pred, target_names=label_encoder.classes_, zero_division=0))
    print("Confusion matrix (rows=true, cols=predicted):")
    print(pd.DataFrame(
        confusion_matrix(y_true, y_pred),
        index=label_encoder.classes_,
        columns=label_encoder.classes_,
    ))


if __name__ == "__main__":
    main()
