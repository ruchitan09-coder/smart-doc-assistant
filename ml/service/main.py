"""
Inference service for the custom-trained document classification model.
This is what MODEL_API_URL (see .env.example) should point at -- the Next.js
app calls POST /predict, matching src/lib/classifier/remote.ts.

Prefers a fine-tuned transformer model (ml/models/distilbert_classifier/final,
produced by ml/training/train_transformer.py) if present; otherwise falls
back to the TF-IDF + logistic regression baseline
(ml/models/tfidf_baseline, produced by ml/training/train_tfidf_baseline.py).
If neither has been trained yet, falls back further to a small built-in
keyword heuristic so the endpoint never 500s -- train a real model with the
scripts in ml/training/ to replace it.

Run locally:
    pip install -r ml/service/requirements.txt
    uvicorn ml.service.main:app --host 0.0.0.0 --port 8000

Then point the Next.js app at it:
    MODEL_API_URL="http://localhost:8000"
"""
import json
import re
import sys
from pathlib import Path
from typing import Callable, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preprocessing.clean import clean_text  # noqa: E402

ML_ROOT = Path(__file__).resolve().parents[1]
TRANSFORMER_DIR = ML_ROOT / "models" / "distilbert_classifier"
BASELINE_DIR = ML_ROOT / "models" / "tfidf_baseline"

app = FastAPI(title="Document Classifier Inference Service", version="1.0")


class PredictRequest(BaseModel):
    text: str


class PredictResponse(BaseModel):
    label: str
    confidence: float
    scores: Dict[str, float]
    model_version: str


class LoadedModel:
    kind: str  # "transformer" | "baseline" | "heuristic"
    version: str
    predict_fn: Callable[[str], Dict[str, float]]


_model: Optional[LoadedModel] = None


def _try_load_transformer() -> Optional[LoadedModel]:
    final_dir = TRANSFORMER_DIR / "final"
    label_map_path = TRANSFORMER_DIR / "label_map.json"
    version_path = TRANSFORMER_DIR / "version.json"
    if not (final_dir.exists() and label_map_path.exists()):
        return None

    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(final_dir)
    model = AutoModelForSequenceClassification.from_pretrained(final_dir)
    model.eval()
    label_map = json.loads(label_map_path.read_text())
    version = json.loads(version_path.read_text())["model_version"] if version_path.exists() else "transformer"

    def predict_fn(text: str) -> Dict[str, float]:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=256)
        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)[0].tolist()
        return {label_map[str(i)]: p for i, p in enumerate(probs)}

    loaded = LoadedModel()
    loaded.kind = "transformer"
    loaded.version = version
    loaded.predict_fn = predict_fn
    return loaded


def _try_load_baseline() -> Optional[LoadedModel]:
    if not (BASELINE_DIR / "model.joblib").exists():
        return None

    import joblib

    model = joblib.load(BASELINE_DIR / "model.joblib")
    vectorizer = joblib.load(BASELINE_DIR / "vectorizer.joblib")
    label_encoder = joblib.load(BASELINE_DIR / "label_encoder.joblib")
    version_path = BASELINE_DIR / "version.json"
    version = json.loads(version_path.read_text())["model_version"] if version_path.exists() else "tfidf-logreg-v1"

    def predict_fn(text: str) -> Dict[str, float]:
        vector = vectorizer.transform([text])
        probs = model.predict_proba(vector)[0]
        return {cls: float(p) for cls, p in zip(label_encoder.classes_, probs)}

    loaded = LoadedModel()
    loaded.kind = "baseline"
    loaded.version = version
    loaded.predict_fn = predict_fn
    return loaded


# Zero-dependency fallback so the service always responds even before any
# model has been trained -- makes it easy to stand the service up first and
# swap in a trained model later without changing MODEL_API_URL.
_KEYWORD_HINTS = {
    "invoice": ["invoice", "amount due", "bill to", "remit payment"],
    "contract": ["agreement", "hereinafter", "terms and conditions", "parties"],
    "research_paper": ["abstract", "methodology", "hypothesis", "literature review"],
    "resume": ["curriculum vitae", "work experience", "objective", "references available"],
    "report": ["executive summary", "quarterly report", "key performance", "findings"],
    "assignment": ["assignment", "homework", "due date", "rubric"],
    "policy": ["policy", "guidelines", "eligibility", "compliance"],
    "receipt": ["receipt", "subtotal", "change due", "thank you for your purchase"],
    "legal_document": ["plaintiff", "defendant", "affidavit", "power of attorney", "hereby ordered"],
    "business_document": ["meeting minutes", "memo", "purchase order", "business plan"],
}


def _heuristic_predict(text: str) -> Dict[str, float]:
    lowered = text.lower()
    raw_scores = {}
    for label, keywords in _KEYWORD_HINTS.items():
        hits = sum(1 for kw in keywords if kw in lowered)
        raw_scores[label] = hits

    total = sum(raw_scores.values())
    if total == 0:
        n = len(raw_scores)
        return {label: 1 / n for label in raw_scores}
    return {label: score / total for label, score in raw_scores.items()}


def get_model() -> LoadedModel:
    global _model
    if _model is not None:
        return _model

    _model = _try_load_transformer() or _try_load_baseline()
    if _model is None:
        _model = LoadedModel()
        _model.kind = "heuristic"
        _model.version = "keyword-heuristic-v0"
        _model.predict_fn = _heuristic_predict

    return _model


@app.get("/health")
def health():
    model = get_model()
    return {"status": "ok", "model_kind": model.kind, "model_version": model.version}


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")

    model = get_model()
    cleaned = clean_text(request.text)
    scores = model.predict_fn(cleaned)
    best_label = max(scores, key=scores.get)

    return PredictResponse(
        label=best_label,
        confidence=scores[best_label],
        scores=scores,
        model_version=model.version,
    )
