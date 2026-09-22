"""
Command-line prediction against a trained TF-IDF baseline model -- useful for
quickly testing the model without running the FastAPI service. The service
in ml/service/main.py uses the same load_model()/predict() logic.

Usage:
    python ml/inference/predict.py --model ml/models/tfidf_baseline --text "Invoice #4471, due in 30 days..."
"""
import argparse
import sys
from pathlib import Path

import joblib

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preprocessing.clean import clean_text  # noqa: E402


def load_model(model_dir: str):
    model_dir = Path(model_dir)
    model = joblib.load(model_dir / "model.joblib")
    vectorizer = joblib.load(model_dir / "vectorizer.joblib")
    label_encoder = joblib.load(model_dir / "label_encoder.joblib")
    return model, vectorizer, label_encoder


def predict(text: str, model, vectorizer, label_encoder) -> dict:
    cleaned = clean_text(text)
    vector = vectorizer.transform([cleaned])
    probabilities = model.predict_proba(vector)[0]
    scores = {cls: float(p) for cls, p in zip(label_encoder.classes_, probabilities)}
    best_label = max(scores, key=scores.get)
    return {"label": best_label, "confidence": scores[best_label], "scores": scores}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Classify a document snippet.")
    parser.add_argument("--model", default="ml/models/tfidf_baseline")
    parser.add_argument("--text", required=True)
    args = parser.parse_args()

    model, vectorizer, label_encoder = load_model(args.model)
    result = predict(args.text, model, vectorizer, label_encoder)

    print(f"Predicted class: {result['label']} ({result['confidence']:.1%} confidence)")
    for cls, score in sorted(result["scores"].items(), key=lambda x: -x[1]):
        print(f"  {cls:20s} {score:.1%}")
